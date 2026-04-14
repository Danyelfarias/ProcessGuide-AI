import { Building2 } from 'lucide-react'
import useStore from '../../store/useStore'

export default function Header() {
  const currentProcess      = useStore((s) => s.currentProcess)
  const simulationMode      = useStore((s) => s.simulationMode)
  const toggleSimulationMode = useStore((s) => s.toggleSimulationMode)

  return (
    <header className="h-14 bento-card mx-4 px-6 flex items-center justify-between z-20 shrink-0">
      {/* Process identity */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-slate-800 leading-tight truncate">
            {currentProcess?.name || 'Selecione um Processo'}
          </h2>
          {currentProcess?.sector && (
            <div className="flex items-center gap-1 mt-0.5">
              <Building2 size={10} className="text-slate-400 shrink-0" />
              <span className="text-[11px] text-slate-400">{currentProcess.sector}</span>
            </div>
          )}
        </div>
      </div>

      {/* Edit mode toggle */}
      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full shrink-0">
        <span className="text-xs font-bold text-slate-600">Modo Edição</span>
        <button
          onClick={toggleSimulationMode}
          aria-label="Toggle edit mode"
          className={`w-11 h-6 rounded-full relative transition-colors duration-300 overflow-hidden shrink-0
            ${simulationMode ? 'bg-emerald-500' : 'bg-slate-300'}`}
        >
          <span className={`absolute top-[3px] w-[18px] h-[18px] bg-white rounded-full shadow transition-all duration-300
            ${simulationMode ? 'left-[23px]' : 'left-[3px]'}`}
          />
        </button>
      </div>
    </header>
  )
}
