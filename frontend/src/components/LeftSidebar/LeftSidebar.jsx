import { useState, useRef, useCallback } from 'react'
import { Search, Plus, FileDown, Trash2, AlertTriangle, Clock, Filter } from 'lucide-react'
import useStore from '../../store/useStore'
import CreateProcessModal from '../CreateProcessModal'

// ── Logo ──────────────────────────────────────────────────────────────────────
function Logo() {
  return (
    <div className="bento-card p-4 flex items-center gap-3 shrink-0">
      <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-md">
        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
          <rect x="3" y="3" width="7" height="5" rx="1" fill="white" />
          <rect x="14" y="3" width="7" height="5" rx="1" fill="white" />
          <rect x="8" y="13" width="8" height="5" rx="1" fill="white" />
          <path d="M6.5 8v3h11V8" stroke="white" strokeWidth="1.5" fill="none" />
          <path d="M12 11v2" stroke="white" strokeWidth="1.5" />
        </svg>
      </div>
      <div>
        <h1 className="text-sm font-bold tracking-tight text-slate-800">ProcessGuide AI</h1>
        <p className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider">Enterprise BPM</p>
      </div>
    </div>
  )
}

// ── Delete confirmation ───────────────────────────────────────────────────────
function ConfirmDialog({ title, body, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(2px)' }}
    >
      <div className="bg-white rounded-2xl shadow-xl p-6 w-[340px]">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-9 h-9 bg-rose-100 rounded-full flex items-center justify-center shrink-0">
            <AlertTriangle size={16} className="text-rose-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">{title}</p>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">{body}</p>
          </div>
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

// ── Process list ──────────────────────────────────────────────────────────────
function ProcessList() {
  const workspaces       = useStore((s) => s.workspaces)
  const currentWorkspace = useStore((s) => s.currentWorkspace)
  const setCurrentWorkspace = useStore((s) => s.setCurrentWorkspace)
  const processes        = useStore((s) => s.processes)
  const currentProcess   = useStore((s) => s.currentProcess)
  const setCurrentProcess = useStore((s) => s.setCurrentProcess)
  const loadProcessFlow  = useStore((s) => s.loadProcessFlow)
  const loadVersions     = useStore((s) => s.loadVersions)
  const loadDocuments    = useStore((s) => s.loadDocuments)
  const createProcess    = useStore((s) => s.createProcess)
  const deleteProcess    = useStore((s) => s.deleteProcess)

  const [search, setSearch]           = useState('')
  const [sectorFilter, setSectorFilter] = useState('')
  const [showCreate, setShowCreate]   = useState(false)
  const [confirmDel, setConfirmDel]   = useState(null) // { id, name }

  const workspaceProcesses = processes.filter((p) => p.workspace_id === currentWorkspace)
  const sectors = [...new Set(workspaceProcesses.map((p) => p.sector).filter(Boolean))].sort()

  const filtered = workspaceProcesses
    .filter((p) => !sectorFilter || p.sector === sectorFilter)
    .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) ||
                   (p.sector || '').toLowerCase().includes(search.toLowerCase()))

  const handleSelect = (p) => {
    setCurrentProcess(p)
    loadProcessFlow(p.id)
    loadVersions(p.id)
    loadDocuments(p.id)
  }

  const handleCreateConfirm = async ({ name, sector }) => {
    setShowCreate(false)
    await createProcess({ name, sector, workspaceId: currentWorkspace })
  }

  const handleExportDocx = (e, p) => {
    e.stopPropagation()
    window.open(`/api/documents/export/${p.id}/docx`, '_blank')
  }

  const handleDeleteConfirm = async () => {
    if (!confirmDel) return
    await deleteProcess(confirmDel.id)
    setConfirmDel(null)
  }

  return (
    <>
      {showCreate && (
        <CreateProcessModal
          onConfirm={handleCreateConfirm}
          onCancel={() => setShowCreate(false)}
        />
      )}
      {confirmDel && (
        <ConfirmDialog
          title={`Excluir "${confirmDel.name}"?`}
          body="Todos os documentos anexados, o diagrama e o histórico de versões deste processo serão removidos permanentemente."
          onConfirm={handleDeleteConfirm}
          onCancel={() => setConfirmDel(null)}
        />
      )}

      <div className="bento-card p-4 flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Workspace selector */}
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
          Workspace
        </label>
        <select
          value={currentWorkspace ?? ''}
          onChange={(e) => setCurrentWorkspace(Number(e.target.value))}
          className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg px-3 py-2 outline-none focus:border-indigo-500 transition mb-3 cursor-pointer"
        >
          {workspaces.length === 0 && (
            <option value="">Carregando...</option>
          )}
          {workspaces.map((ws) => (
            <option key={ws.id} value={ws.id}>{ws.icon} {ws.name}</option>
          ))}
        </select>

        {/* Header: label + new button */}
        <div className="flex items-center justify-between mb-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Processos
          </label>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition"
          >
            <Plus size={12} /> Novo
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-2">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar processo..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-xs outline-none focus:border-indigo-400 transition"
          />
        </div>

        {/* Sector filter */}
        {sectors.length > 0 && (
          <div className="relative mb-2">
            <Filter size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-xs outline-none focus:border-indigo-400 transition cursor-pointer appearance-none"
            >
              <option value="">Todos os setores</option>
              {sectors.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        )}

        {/* Process items */}
        <div className="flex-1 overflow-y-auto space-y-1">
          {filtered.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">
              {search ? 'Nenhum resultado.' : 'Nenhum processo. Crie um novo.'}
            </p>
          ) : filtered.map((p) => {
            const active = currentProcess?.id === p.id
            return (
              <div
                key={p.id}
                onClick={() => handleSelect(p)}
                className={`group relative w-full text-left px-3 py-2.5 rounded-lg border cursor-pointer transition-all
                  ${active
                    ? 'border-indigo-100 bg-indigo-50'
                    : 'border-transparent hover:bg-slate-50'}`}
              >
                <p className={`text-sm font-semibold leading-snug ${active ? 'text-indigo-700' : 'text-slate-700'}`}>
                  {p.name}
                </p>
                {p.sector && (
                  <p className="text-[10px] text-slate-400 mt-0.5">{p.sector}</p>
                )}

                {/* Hover actions */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1
                  opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => handleExportDocx(e, p)}
                    title="Exportar .docx"
                    className="p-1.5 rounded-lg bg-white border border-slate-200 hover:border-indigo-400 hover:text-indigo-600 text-slate-400 shadow-sm transition"
                  >
                    <FileDown size={11} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmDel({ id: p.id, name: p.name }) }}
                    title="Excluir processo"
                    className="p-1.5 rounded-lg bg-white border border-slate-200 hover:border-rose-400 hover:text-rose-500 text-slate-400 shadow-sm transition"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

// ── Recent activity (bottom history) ─────────────────────────────────────────
function RecentActivity() {
  const processes = useStore((s) => s.processes)
  const setCurrentProcess = useStore((s) => s.setCurrentProcess)
  const loadProcessFlow   = useStore((s) => s.loadProcessFlow)
  const loadVersions      = useStore((s) => s.loadVersions)
  const loadDocuments     = useStore((s) => s.loadDocuments)

  // Sort by updated_at desc, take latest 4
  const recent = [...processes]
    .sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0))
    .slice(0, 4)

  const fmtRelative = (iso) => {
    try {
      const diff = Date.now() - new Date(iso).getTime()
      const m = Math.floor(diff / 60000)
      if (m < 1) return 'agora'
      if (m < 60) return `${m}m atrás`
      const h = Math.floor(m / 60)
      if (h < 24) return `${h}h atrás`
      const d = Math.floor(h / 24)
      return `${d}d atrás`
    } catch { return '' }
  }

  const handleClick = (p) => {
    setCurrentProcess(p)
    loadProcessFlow(p.id)
    loadVersions(p.id)
    loadDocuments(p.id)
  }

  return (
    <div className="bento-card p-4 shrink-0">
      <div className="flex items-center gap-1.5 mb-3">
        <Clock size={11} className="text-slate-400" />
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Atualizados Recentemente
        </label>
      </div>

      <div className="space-y-2">
        {recent.map((p) => (
          <button
            key={p.id}
            onClick={() => handleClick(p)}
            className="w-full text-left group"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-700 truncate group-hover:text-indigo-600 transition">
                  {p.name}
                </p>
                <p className="text-[10px] text-slate-400">
                  {p.updated_by ? `${p.updated_by} · ` : ''}{fmtRelative(p.updated_at)}
                </p>
              </div>
              {p.sector && (
                <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded shrink-0 mt-0.5">
                  {p.sector}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
export default function LeftSidebar() {
  const [width, setWidth] = useState(288) // w-72 = 288px
  const isResizing = useRef(false)
  const startX = useRef(0)
  const startW = useRef(0)

  const onMouseMove = useCallback((e) => {
    if (!isResizing.current) return
    const next = Math.min(500, Math.max(200, startW.current + (e.clientX - startX.current)))
    setWidth(next)
  }, [])

  const onMouseUp = useCallback(() => {
    isResizing.current = false
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }, [onMouseMove])

  const startResize = (e) => {
    isResizing.current = true
    startX.current = e.clientX
    startW.current = width
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  return (
    <aside style={{ width }} className="h-full p-4 flex flex-col gap-4 z-20 shrink-0 relative">
      <Logo />
      <ProcessList />
      <RecentActivity />
      {/* Drag handle */}
      <div
        onMouseDown={startResize}
        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-300 transition-colors"
      />
    </aside>
  )
}
