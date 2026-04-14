import { memo, useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import { Pencil, MessageSquareText, ChevronDown, ChevronUp, Check, Trash2, Sparkles } from 'lucide-react'
import useStore from '../../store/useStore'

// ── BPMN symbol definitions ───────────────────────────────────────────────────
const BPMN_TYPES = [
  { id: 'task',    label: 'Tarefa' },
  { id: 'start',   label: 'Início' },
  { id: 'gateway', label: 'Gateway' },
  { id: 'end',     label: 'Fim' },
]

function BpmnIcon({ type, size = 14, className = '' }) {
  const s = size
  switch (type) {
    case 'start':
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" className={className} fill="none">
          <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="8" cy="8" r="3" fill="currentColor" />
        </svg>
      )
    case 'gateway':
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" className={className} fill="none">
          <path d="M8 1.5 L14.5 8 L8 14.5 L1.5 8 Z" stroke="currentColor" strokeWidth="1.5" />
          <path d="M5 8h6M8 5v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )
    case 'end':
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" className={className} fill="none">
          <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="3" />
        </svg>
      )
    default: // task
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" className={className} fill="none">
          <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M4 7h8M4 10h5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        </svg>
      )
  }
}

function BpmnPicker({ current, onChange }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }}
        title="Tipo BPMN"
        className="p-1 rounded hover:bg-slate-100 text-slate-500 transition flex items-center"
      >
        <BpmnIcon type={current} size={13} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 z-50 flex flex-col gap-0.5 w-28">
          {BPMN_TYPES.map((t) => (
            <button
              key={t.id}
              onClick={(e) => { e.stopPropagation(); onChange(t.id); setOpen(false) }}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium transition
                ${current === t.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <BpmnIcon type={t.id} size={12} />
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── State visual config ───────────────────────────────────────────────────────
const STATE_BORDER = {
  production: 'border-indigo-500',
  simulation: 'node-simulation border-emerald-500',
  draft:      'border-amber-400',
  error:      'border-rose-500',
}
const STATE_STEP_COLOR = {
  production: 'text-indigo-600',
  simulation: 'text-emerald-600',
  draft:      'text-amber-500',
  error:      'text-rose-500',
}

// ── Main node component ───────────────────────────────────────────────────────
function CustomNode({ data, id, selected }) {
  const [collapsed, setCollapsed] = useState(false)
  const [editing, setEditing]     = useState(false)
  const [editLabel, setEditLabel] = useState(data.label)

  const simulationMode  = useStore((s) => s.simulationMode)
  const sendChatMessage = useStore((s) => s.sendChatMessage)
  const setChatContext  = useStore((s) => s.setChatContext)
  const setActiveTab    = useStore((s) => s.setActiveTab)
  const updateNodeData  = useStore((s) => s.updateNodeData)
  const removeNode      = useStore((s) => s.removeNode)

  // In sandbox: every node shows simulation controls
  const effectiveState = simulationMode ? 'simulation' : (data.state || 'production')
  const borderClass    = STATE_BORDER[effectiveState] || STATE_BORDER.production
  const stepColor      = STATE_STEP_COLOR[effectiveState] || STATE_STEP_COLOR.production
  const bpmnType       = data.bpmnType || 'task'

  const handleAskAI = () => {
    setChatContext(data.label)
    setActiveTab('chat')
    sendChatMessage(`Explique a etapa "${data.label}" e quais são os riscos ou regras importantes neste passo.`)
  }

  const handleSaveEdit = () => {
    if (editLabel.trim()) updateNodeData(id, { label: editLabel.trim() })
    setEditing(false)
  }

  const handleApprove = () => updateNodeData(id, { state: 'production' })
  const handleDelete  = () => removeNode(id)
  const handleBpmn    = (type) => updateNodeData(id, { bpmnType: type })

  return (
    <div
      className={`
        relative bg-white rounded-xl border-2 shadow-node w-64 transition-all duration-200
        hover:-translate-y-0.5 hover:shadow-lg select-none
        ${borderClass}
        ${selected ? 'ring-2 ring-offset-2 ring-indigo-400' : ''}
      `}
    >
      {/* Sandbox badge */}
      {simulationMode && (
        <div className="absolute -top-3 right-3 bg-emerald-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow flex items-center gap-1 pointer-events-none">
          <Sparkles size={8} />
          Sandbox
        </div>
      )}

      <Handle type="target" position={Position.Top} className="!top-[-5px]" />

      <div className="p-4">
        {/* Header row: BPMN icon + step label + collapse toggle */}
        <div className="flex items-center gap-1.5 mb-1">
          <BpmnPicker current={bpmnType} onChange={handleBpmn} />
          <span className={`text-[10px] font-bold uppercase tracking-widest flex-1 ${stepColor}`}>
            {data.step || 'Etapa'}
          </span>
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="text-slate-400 hover:text-slate-600 p-0.5"
          >
            {collapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
          </button>
        </div>

        {/* Editable label */}
        {editing ? (
          <input
            autoFocus
            className="w-full text-sm font-bold text-slate-800 border-b border-indigo-400 outline-none bg-transparent mb-1"
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            onBlur={handleSaveEdit}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
          />
        ) : (
          <h3 className="font-bold text-slate-800 text-sm leading-snug">{data.label}</h3>
        )}

        {/* Description */}
        {!collapsed && data.description && (
          <p className="text-xs text-slate-500 mt-2 leading-relaxed line-clamp-2">
            {data.description}
          </p>
        )}
      </div>

      {/* Action bar — always visible when selected, otherwise on hover */}
      <div
        className="border-t border-slate-100 px-3 py-2 flex items-center justify-between transition-opacity duration-150 opacity-0 hover:opacity-100 group-hover:opacity-100"
        style={{ opacity: selected ? 1 : undefined }}
      >
        {simulationMode ? (
          /* Sandbox controls: visible on ALL nodes in sim mode */
          <>
            {data.state !== 'production' && (
              <button onClick={handleApprove} title="Marcar como produção"
                className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 transition">
                <Check size={13} />
              </button>
            )}
            <button onClick={() => setEditing(true)} title="Editar"
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition">
              <Pencil size={13} />
            </button>
            <button onClick={handleDelete} title="Deletar nó"
              className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500 transition">
              <Trash2 size={13} />
            </button>
          </>
        ) : (
          /* Normal mode controls */
          <>
            <button onClick={() => setEditing(true)} title="Editar"
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition">
              <Pencil size={13} />
            </button>
            <button onClick={handleAskAI} title="Perguntar IA"
              className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-600 transition">
              <MessageSquareText size={13} />
            </button>
            <button onClick={() => setCollapsed((v) => !v)} title="Colapsar"
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition">
              <ChevronDown size={13} />
            </button>
          </>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bottom-[-5px]" />
    </div>
  )
}

function WrappedNode(props) {
  return (
    <div className="group">
      <CustomNode {...props} />
    </div>
  )
}

export default memo(WrappedNode)
