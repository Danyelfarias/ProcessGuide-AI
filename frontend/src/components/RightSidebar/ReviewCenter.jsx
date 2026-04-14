import { CheckCircle2, Loader2, Plus, RefreshCw, Pencil, Trash2 } from 'lucide-react'
import useStore from '../../store/useStore'

const ACTION_CONFIG = {
  ADD:    { label: 'Adicionar Nó',  icon: Plus,     bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
  UPDATE: { label: 'Atualizar Nó', icon: Pencil,   bg: 'bg-amber-100',   text: 'text-amber-700',   border: 'border-amber-200'   },
  DELETE: { label: 'Remover Nó',   icon: Trash2,   bg: 'bg-rose-100',    text: 'text-rose-700',    border: 'border-rose-200'    },
}

function ChangeCard({ change }) {
  const approveChange = useStore((s) => s.approveChange)
  const ignoreChange = useStore((s) => s.ignoreChange)
  const config = ACTION_CONFIG[change.action] || ACTION_CONFIG.ADD
  const Icon = config.icon

  return (
    <div className={`bg-white border ${config.border} p-4 rounded-xl shadow-sm`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`${config.bg} ${config.text} text-[10px] font-bold px-2 py-0.5 rounded uppercase flex items-center gap-1`}>
          <Icon size={10} />
          {config.label}
        </span>
      </div>

      <p className="text-sm font-bold text-slate-800">{change.title}</p>
      <p className="text-xs text-slate-500 mt-1 line-clamp-3 leading-relaxed">
        {change.description}
      </p>

      <div className="flex gap-2 mt-4">
        <button
          onClick={() => approveChange(change.id)}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 rounded-lg transition shadow-sm flex items-center justify-center gap-1"
        >
          <CheckCircle2 size={12} />
          Aprovar
        </button>
        <button
          onClick={() => ignoreChange(change.id)}
          className="flex-1 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold py-2 rounded-lg transition shadow-sm"
        >
          Ignorar
        </button>
      </div>
    </div>
  )
}

export default function ReviewCenter() {
  const pendingChanges = useStore((s) => s.pendingChanges)
  const diffLoading = useStore((s) => s.diffLoading)
  const publishVersion = useStore((s) => s.publishVersion)
  const versions = useStore((s) => s.versions)

  const allApproved = pendingChanges.length === 0

  const handlePublish = async () => {
    const tag = `v${(versions.length + 1)}.0`
    await publishVersion(tag, 'User')
  }

  if (diffLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 text-slate-500 gap-3">
        <Loader2 size={28} className="animate-spin text-indigo-500" />
        <p className="text-sm font-semibold">Analisando divergências...</p>
        <p className="text-xs text-slate-400 text-center">A IA está comparando o novo documento com o fluxo atual.</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col p-4 bg-slate-50/50 min-h-0">
      <p className="text-xs text-slate-500 mb-4 leading-relaxed">
        {allApproved
          ? 'Todas as revisões foram processadas. Você pode publicar a nova versão.'
          : `A IA identificou ${pendingChanges.length} divergência(s) entre o Canvas e o documento importado.`}
      </p>

      <div className="space-y-3 overflow-y-auto flex-1">
        {pendingChanges.map((change) => (
          <ChangeCard key={change.id} change={change} />
        ))}

        {allApproved && (
          <div className="text-center py-6">
            <CheckCircle2 className="text-emerald-500 mx-auto mb-2" size={28} />
            <p className="text-sm font-bold text-slate-700">Todas as revisões aprovadas!</p>
            <p className="text-xs text-slate-400 mt-1">Publique para salvar a nova versão.</p>
          </div>
        )}
      </div>

      <div className="mt-auto border-t border-slate-200 pt-4 shrink-0">
        <button
          onClick={handlePublish}
          disabled={!allApproved}
          className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-md hover:bg-indigo-700 transition disabled:opacity-40 disabled:cursor-not-allowed hover:-translate-y-0.5 hover:shadow-indigo-200 hover:shadow-lg"
        >
          Publicar Nova Versão
        </button>
        {!allApproved && (
          <p className="text-[10px] text-center text-slate-400 mt-2">
            Aprove todas as revisões para publicar.
          </p>
        )}
      </div>
    </div>
  )
}
