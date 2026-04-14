import { memo } from 'react'
import { getBezierPath, EdgeLabelRenderer, BaseEdge } from '@xyflow/react'
import { HelpCircle, X } from 'lucide-react'
import useStore from '../../store/useStore'

function CustomEdge({
  id,
  sourceX, sourceY,
  targetX, targetY,
  sourcePosition, targetPosition,
  source, target,
}) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  })

  const nodes         = useStore((s) => s.nodes)
  const simulationMode = useStore((s) => s.simulationMode)
  const setActiveTab  = useStore((s) => s.setActiveTab)
  const setChatContext = useStore((s) => s.setChatContext)
  const sendChatMessage = useStore((s) => s.sendChatMessage)
  const removeEdge    = useStore((s) => s.removeEdge)

  const sourceNode = nodes.find((n) => n.id === source)
  const targetNode = nodes.find((n) => n.id === target)

  const handleAskAI = (e) => {
    e.stopPropagation()
    const srcLabel = sourceNode?.data?.label || source
    const tgtLabel = targetNode?.data?.label || target
    setChatContext(`${srcLabel} → ${tgtLabel}`)
    setActiveTab('chat')
    sendChatMessage(`Quais são os riscos e regras de negócio na transição de "${srcLabel}" para "${tgtLabel}"?`)
  }

  const handleDelete = (e) => {
    e.stopPropagation()
    removeEdge(id)
  }

  // In sim mode: edge turns emerald + shows delete button instead of AI button
  const strokeColor = simulationMode ? '#10B981' : '#cbd5e1'

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{ stroke: strokeColor, strokeWidth: 2, transition: 'stroke 0.2s' }}
      />

      <EdgeLabelRenderer>
        <div
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="absolute nodrag nopan flex items-center gap-1"
        >
          {simulationMode ? (
            /* Sandbox: show red X to break the connection */
            <button
              onClick={handleDelete}
              title="Remover conexão"
              className="
                w-6 h-6 bg-white border border-rose-300 rounded-full
                flex items-center justify-center shadow
                text-rose-400 hover:text-rose-600 hover:border-rose-500
                hover:scale-110 hover:shadow-rose-100 hover:shadow-md
                transition-all duration-150
              "
            >
              <X size={10} />
            </button>
          ) : (
            /* Normal: ask AI about this transition */
            <button
              onClick={handleAskAI}
              title="Analisar transição com IA"
              className="
                w-6 h-6 bg-white border border-slate-200 rounded-full
                flex items-center justify-center shadow
                text-slate-400 hover:text-indigo-600 hover:border-indigo-400
                hover:scale-110 hover:shadow-indigo-100 hover:shadow-md
                transition-all duration-150
              "
            >
              <HelpCircle size={11} />
            </button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

export default memo(CustomEdge)
