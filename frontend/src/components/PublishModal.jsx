import { useState } from 'react'
import { X, Rocket, Building2, Tag, User } from 'lucide-react'

const SECTORS = [
  'Logística', 'Recursos Humanos', 'Financeiro', 'Comercial',
  'Operações', 'TI / Tecnologia', 'Jurídico', 'Qualidade', 'Outro',
]

export default function PublishModal({ currentProcess, versions, onConfirm, onCancel }) {
  const nextTag = `v${versions.length + 1}.0`

  const [processName, setProcessName] = useState(currentProcess?.name || '')
  const [sector, setSector]           = useState('')
  const [customSector, setCustomSector] = useState('')
  const [versionTag, setVersionTag]   = useState(nextTag)
  const [author, setAuthor]           = useState('User')
  const [errors, setErrors]           = useState({})

  const validate = () => {
    const e = {}
    if (!processName.trim()) e.processName = 'Obrigatório'
    if (!sector) e.sector = 'Selecione um setor'
    if (!versionTag.trim()) e.versionTag = 'Obrigatório'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleConfirm = () => {
    if (!validate()) return
    onConfirm({
      processName: processName.trim(),
      sector: sector === 'Outro' ? customSector.trim() || 'Outro' : sector,
      versionTag: versionTag.trim(),
      author: author.trim() || 'User',
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(2px)' }}
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-[420px] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Rocket size={14} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Publicar Nova Versão</h2>
              <p className="text-[11px] text-slate-500">Preencha os metadados obrigatórios</p>
            </div>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-700 transition">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          {/* Process name */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Nome do Processo *
            </label>
            <input
              value={processName}
              onChange={(e) => setProcessName(e.target.value)}
              placeholder="Ex: Recebimento de Carga"
              className={`w-full bg-slate-50 border rounded-xl px-3 py-2.5 text-sm outline-none
                focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition
                ${errors.processName ? 'border-rose-400' : 'border-slate-200'}`}
            />
            {errors.processName && <p className="text-rose-500 text-[11px] mt-1">{errors.processName}</p>}
          </div>

          {/* Sector */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Building2 size={11} />
              Setor Responsável *
            </label>
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className={`w-full bg-slate-50 border rounded-xl px-3 py-2.5 text-sm outline-none
                focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition cursor-pointer
                ${errors.sector ? 'border-rose-400' : 'border-slate-200'}`}
            >
              <option value="">— Selecione —</option>
              {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            {sector === 'Outro' && (
              <input
                className="mt-2 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-500 transition"
                placeholder="Nome do setor"
                value={customSector}
                onChange={(e) => setCustomSector(e.target.value)}
              />
            )}
            {errors.sector && <p className="text-rose-500 text-[11px] mt-1">{errors.sector}</p>}
          </div>

          {/* Version tag + Author (side by side) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Tag size={11} />
                Tag da Versão *
              </label>
              <input
                value={versionTag}
                onChange={(e) => setVersionTag(e.target.value)}
                placeholder="v1.0"
                className={`w-full bg-slate-50 border rounded-xl px-3 py-2.5 text-sm outline-none
                  focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition
                  ${errors.versionTag ? 'border-rose-400' : 'border-slate-200'}`}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <User size={11} />
                Autor
              </label>
              <input
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Seu nome"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-500 transition"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-semibold rounded-xl transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow transition hover:-translate-y-0.5 hover:shadow-indigo-200 hover:shadow-lg"
          >
            🚀 Publicar
          </button>
        </div>
      </div>
    </div>
  )
}
