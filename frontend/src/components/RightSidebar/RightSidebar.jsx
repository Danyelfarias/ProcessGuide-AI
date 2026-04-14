import { useState, useRef, useCallback } from 'react'
import { BotMessageSquare, Activity } from 'lucide-react'
import useStore from '../../store/useStore'
import ChatPanel from './ChatPanel'
import StatusPanel from './StatusPanel'

export default function RightSidebar() {
  const activeTab      = useStore((s) => s.activeTab)
  const setActiveTab   = useStore((s) => s.setActiveTab)
  const pendingChanges = useStore((s) => s.pendingChanges)

  const [width, setWidth] = useState(400)
  const isResizing = useRef(false)
  const startX = useRef(0)
  const startW = useRef(0)

  const onMouseMove = useCallback((e) => {
    if (!isResizing.current) return
    // dragging left = larger width
    const next = Math.min(700, Math.max(280, startW.current + (startX.current - e.clientX)))
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

  const base     = 'flex-1 py-3 text-sm font-semibold transition flex items-center justify-center gap-1.5 border-b-2'
  const active   = `${base} text-indigo-600 border-indigo-600`
  const inactive = `${base} text-slate-500 hover:text-slate-700 border-transparent`

  return (
    <aside style={{ width }} className="h-full p-4 pl-0 flex flex-col gap-4 z-20 shrink-0 relative">
      {/* Drag handle on left edge */}
      <div
        onMouseDown={startResize}
        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-300 transition-colors"
      />
      <div className="bento-card flex-1 flex flex-col overflow-hidden">

        {/* Tab bar */}
        <div className="flex border-b border-slate-200 bg-slate-50/50 rounded-t-2xl shrink-0">
          <button
            onClick={() => setActiveTab('chat')}
            className={activeTab === 'chat' ? active : inactive}
          >
            <BotMessageSquare size={14} />
            Assistente IA
          </button>
          <button
            onClick={() => setActiveTab('status')}
            className={activeTab === 'status' ? active : inactive}
          >
            <Activity size={14} />
            Status
            {pendingChanges.length > 0 && (
              <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ml-0.5">
                {pendingChanges.length}
              </span>
            )}
          </button>
        </div>

        {/* Panels */}
        {activeTab === 'chat' ? <ChatPanel /> : <StatusPanel />}
      </div>
    </aside>
  )
}
