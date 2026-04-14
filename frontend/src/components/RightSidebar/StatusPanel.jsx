import { useState, useEffect } from 'react'
import {
  FileText, Sparkles, GitBranch, CheckCircle2,
  X, Rocket, Layers, Pencil, Trash2,
  Plus, Loader2, CheckCircle, Upload, AlertTriangle,
} from 'lucide-react'
import useStore from '../../store/useStore'

// ── Activity type config ───────────────────────────────────────────────────────
const ACTIVITY_CFG = {
  create:   { Icon: Plus,         bg: 'bg-indigo-100',  text: 'text-indigo-600',  label: 'Criação'     },
  import:   { Icon: FileText,     bg: 'bg-blue-100',    text: 'text-blue-600',    label: 'Importação'  },
  generate: { Icon: Sparkles,     bg: 'bg-violet-100',  text: 'text-violet-600',  label: 'Geração IA'  },
  diff:     { Icon: GitBranch,    bg: 'bg-amber-100',   text: 'text-amber-600',   label: 'Análise'     },
  approve:  { Icon: CheckCircle2, bg: 'bg-emerald-100', text: 'text-emerald-600', label: 'Aprovação'   },
  reject:   { Icon: X,            bg: 'bg-rose-100',    text: 'text-rose-500',    label: 'Ignorado'    },
  publish:  { Icon: Rocket,       bg: 'bg-indigo-100',  text: 'text-indigo-700',  label: 'Publicação'  },
  sandbox:  { Icon: Layers,       bg: 'bg-emerald-100', text: 'text-emerald-600', label: 'Sandbox'     },
  edit:     { Icon: Pencil,       bg: 'bg-slate-100',   text: 'text-slate-500',   label: 'Edição'      },
  delete:   { Icon: Trash2,       bg: 'bg-rose-100',    text: 'text-rose-500',    label: 'Exclusão'    },
}

const ACTION_CFG = {
  ADD:    { Icon: Plus,   bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Adicionar Nó' },
  UPDATE: { Icon: Pencil, bg: 'bg-amber-100',   text: 'text-amber-700',   border: 'border-amber-200',   label: 'Atualizar Nó' },
  DELETE: { Icon: Trash2, bg: 'bg-rose-100',    text: 'text-rose-700',    border: 'border-rose-200',    label: 'Remover Nó'   },
}

function fmtTime(iso) {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    })
  } catch { return iso }
}

// ── Confirm delete dialog ─────────────────────────────────────────────────────
function ConfirmDialog({ filename, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(2px)' }}>
      <div className="bg-white rounded-2xl shadow-xl p-6 w-80">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-8 h-8 bg-rose-100 rounded-full flex items-center justify-center shrink-0">
            <AlertTriangle size={14} className="text-rose-600" />
          </div>
          <p className="text-sm font-semibold text-slate-700">
            Excluir <span className="text-rose-600">"{filename}"</span>?
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-semibold rounded-xl transition">
            Cancelar
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-xl transition">
            Excluir
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Documents section ─────────────────────────────────────────────────────────
function DocumentsSection() {
  const currentProcess  = useStore((s) => s.currentProcess)
  const documents       = useStore((s) => s.documents)
  const importing       = useStore((s) => s.importing)
  const generating      = useStore((s) => s.generating)
  const uploadDocument  = useStore((s) => s.uploadDocument)
  const deleteDocument  = useStore((s) => s.deleteDocument)
  const generateDiagram = useStore((s) => s.generateDiagram)
  const loadDocuments   = useStore((s) => s.loadDocuments)
  const setActiveTab    = useStore((s) => s.setActiveTab)

  // Load documents whenever the active process changes
  useEffect(() => {
    if (currentProcess?.id) loadDocuments(currentProcess.id)
  }, [currentProcess?.id])

  const [confirmDel, setConfirmDel] = useState(null)

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    await uploadDocument(file)
    e.target.value = ''
  }

  const handleConfirmDel = async () => {
    if (!confirmDel) return
    await deleteDocument(confirmDel.id)
    setConfirmDel(null)
  }

  const handleGenerate = async () => {
    setActiveTab('chat')
    await generateDiagram()
  }

  // unique id so label links to the right input even if multiple instances exist
  const inputId = `file-upload-${currentProcess?.id ?? 'new'}`

  return (
    <>
      {confirmDel && (
        <ConfirmDialog
          filename={confirmDel.filename}
          onConfirm={handleConfirmDel}
          onCancel={() => setConfirmDel(null)}
        />
      )}

      {/*
        Use <label htmlFor> pattern — the only 100% reliable way to open a file
        picker across all browsers on Windows. display:none + ref.click() is blocked
        by Chrome/Edge security policies for programmatic clicks on file inputs.
      */}
      <input
        id={inputId}
        type="file"
        accept=".pdf,.docx,.md,.txt"
        style={{ position: 'absolute', width: 0, height: 0, opacity: 0, overflow: 'hidden' }}
        onChange={handleFile}
        disabled={importing}
      />

      <div className="px-4 pt-4 pb-3 border-b border-slate-100 shrink-0">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
          Documentos Vinculados
        </p>

        {/* Document list */}
        {documents.length > 0 ? (
          <div className="space-y-1.5 mb-3">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center gap-2 px-2.5 py-2 bg-slate-50 border border-slate-100 rounded-lg group">
                <FileText size={11} className="text-slate-400 shrink-0" />
                <span className="text-xs text-slate-600 flex-1 truncate" title={doc.filename}>
                  {doc.filename}
                </span>
                <span className="text-[10px] text-slate-400 shrink-0">{fmtTime(doc.uploaded_at)}</span>
                <button
                  type="button"
                  onClick={() => setConfirmDel({ id: doc.id, filename: doc.filename })}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-all"
                >
                  <Trash2 size={10} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 mb-3">Nenhum documento anexado.</p>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          <label
            htmlFor={inputId}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 border border-dashed border-slate-300 rounded-lg text-xs text-slate-500 font-semibold
              hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition
              ${importing ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer'}`}
          >
            {importing
              ? <><Loader2 size={11} className="animate-spin" /> Enviando...</>
              : <><Upload size={11} /> Importar</>}
          </label>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || importing || documents.length === 0}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {generating
              ? <><Loader2 size={11} className="animate-spin" /> Gerando...</>
              : <><Sparkles size={11} /> Gerar Diagrama</>}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Pending change card ───────────────────────────────────────────────────────
function ChangeCard({ change }) {
  const approveChange = useStore((s) => s.approveChange)
  const ignoreChange  = useStore((s) => s.ignoreChange)
  const cfg = ACTION_CFG[change.action] || ACTION_CFG.ADD
  const { Icon } = cfg

  return (
    <div className={`bg-white border ${cfg.border} rounded-xl p-3.5 shadow-sm`}>
      <span className={`${cfg.bg} ${cfg.text} text-[10px] font-bold px-2 py-0.5 rounded uppercase inline-flex items-center gap-1 mb-2`}>
        <Icon size={9} />{cfg.label}
      </span>
      <p className="text-sm font-bold text-slate-800">{change.title}</p>
      <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">{change.description}</p>
      <div className="flex gap-2 mt-3">
        <button onClick={() => approveChange(change.id)}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-1.5 rounded-lg transition flex items-center justify-center gap-1">
          <CheckCircle size={10} /> Aprovar
        </button>
        <button onClick={() => ignoreChange(change.id)}
          className="flex-1 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold py-1.5 rounded-lg transition">
          Ignorar
        </button>
      </div>
    </div>
  )
}

// ── Activity row ──────────────────────────────────────────────────────────────
function ActivityRow({ event }) {
  const cfg = ACTIVITY_CFG[event.type] || ACTIVITY_CFG.edit
  const { Icon } = cfg
  return (
    <div className="flex items-start gap-2.5">
      <div className={`w-6 h-6 rounded-full ${cfg.bg} flex items-center justify-center shrink-0 mt-0.5`}>
        <Icon size={10} className={cfg.text} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-700 leading-snug">{event.text}</p>
        <p className="text-[10px] text-slate-400 mt-0.5">{fmtTime(event.ts)}</p>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function StatusPanel() {
  const currentProcess = useStore((s) => s.currentProcess)
  const pendingChanges = useStore((s) => s.pendingChanges)
  const diffLoading    = useStore((s) => s.diffLoading)

  // Read the raw log array (stable reference) — reverse in render, NOT in selector
  // Doing [...arr].reverse() inside a useStore selector creates a new array reference
  // on every call, causing an infinite re-render loop. Always keep selectors pure.
  const activityLog = useStore((s) =>
    s.activityLogs[String(s.currentProcess?.id ?? '')]
  ) ?? []
  const activities = [...activityLog].reverse()

  if (!currentProcess) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <p className="text-sm text-slate-400 text-center">Selecione um processo para ver o status.</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Documents + Generate */}
      <DocumentsSection />

      {/* Pending changes (diff review) */}
      {(pendingChanges.length > 0 || diffLoading) && (
        <div className="px-4 pt-3 pb-3 border-b border-slate-100 shrink-0">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            {diffLoading
              ? <><Loader2 size={10} className="animate-spin" /> Analisando...</>
              : <><GitBranch size={10} /> {pendingChanges.length} mudança(s) para revisar</>}
          </p>
          {diffLoading ? (
            <div className="bg-slate-50 rounded-xl p-3 text-center text-xs text-slate-500">
              <Loader2 size={16} className="animate-spin text-indigo-400 mx-auto mb-1" />
              Comparando documento com o diagrama atual...
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {pendingChanges.map((c) => <ChangeCard key={c.id} change={c} />)}
            </div>
          )}
        </div>
      )}

      {/* Activity log */}
      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-4">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
          Histórico de Atividades
        </p>
        {activities.length === 0 ? (
          <div className="text-center py-6">
            <Layers size={20} className="text-slate-200 mx-auto mb-2" />
            <p className="text-xs text-slate-400">Nenhuma atividade ainda.</p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {activities.map((ev) => <ActivityRow key={ev.id} event={ev} />)}
          </div>
        )}
      </div>
    </div>
  )
}
