import { useCallback } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { toPng, toSvg } from 'html-to-image'
import { PlusCircle, Download, CheckCircle, Upload, Loader2 } from 'lucide-react'

import CustomNode from './CustomNode'
import CustomEdge from './CustomEdge'
import useStore from '../../store/useStore'

const nodeTypes = { custom: CustomNode }
const edgeTypes = { custom: CustomEdge }
const defaultEdgeOptions = { type: 'custom', animated: false }

function FlowCanvas() {
  // Use Zustand as the single source of truth — no dual-state
  const nodes          = useStore((s) => s.nodes)
  const edges          = useStore((s) => s.edges)
  const setNodes       = useStore((s) => s.setNodes)
  const setEdges       = useStore((s) => s.setEdges)
  const simulationMode = useStore((s) => s.simulationMode)
  const saveFlow       = useStore((s) => s.saveFlow)
  const importing      = useStore((s) => s.importing)
  const currentProcess = useStore((s) => s.currentProcess)

  const onNodesChange = useCallback(
    (changes) => setNodes(applyNodeChanges(changes, nodes)),
    [nodes, setNodes]
  )

  const onEdgesChange = useCallback(
    (changes) => setEdges(applyEdgeChanges(changes, edges)),
    [edges, setEdges]
  )

  const onConnect = useCallback(
    (params) => setEdges(addEdge({ ...params, type: 'custom' }, edges)),
    [edges, setEdges]
  )

  const addBlankNode = useCallback(() => {
    const id = `node-${Date.now()}`
    const newNode = {
      id,
      type: 'custom',
      position: { x: 250, y: (nodes.length + 1) * 180 + 50 },
      data: {
        label: 'Novo Passo',
        step: `Etapa ${String(nodes.length + 1).padStart(2, '0')}`,
        description: '',
        state: simulationMode ? 'simulation' : 'draft',
      },
    }
    const updated = [...nodes, newNode]
    setNodes(updated)
    // Persist immediately after adding
    setTimeout(() => saveFlow(), 0)
  }, [nodes, setNodes, simulationMode, saveFlow])

  const handleExportPng = useCallback(async () => {
    const el = document.querySelector('.react-flow__viewport')
    if (!el) return
    const dataUrl = await toPng(el, { cacheBust: true, backgroundColor: '#ffffff' })
    const a = document.createElement('a')
    a.download = 'processguide-flow.png'
    a.href = dataUrl
    a.click()
  }, [])

  const handleExportSvg = useCallback(async () => {
    const el = document.querySelector('.react-flow__viewport')
    if (!el) return
    const dataUrl = await toSvg(el, { backgroundColor: '#ffffff' })
    const a = document.createElement('a')
    a.download = 'processguide-flow.svg'
    a.href = dataUrl
    a.click()
  }, [])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>

      {/* ── Loading overlay while importing ── */}
      {importing && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/70 backdrop-blur-sm rounded-2xl">
          <Loader2 size={32} className="text-indigo-500 animate-spin mb-3" />
          <p className="text-sm font-bold text-slate-700">Processando documento...</p>
          <p className="text-xs text-slate-400 mt-1">A IA está gerando o diagrama</p>
        </div>
      )}

      {/* ── Empty canvas state (no nodes yet) ── */}
      {!importing && nodes.length === 0 && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 text-center border border-slate-200 shadow-lg max-w-xs">
            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Upload size={22} className="text-indigo-400" />
            </div>
            <h3 className="font-bold text-slate-700 text-sm mb-1">
              {currentProcess ? `"${currentProcess.name}"` : 'Processo sem diagrama'}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Importe um documento na barra lateral para que a IA gere automaticamente o diagrama deste processo.
            </p>
          </div>
        </div>
      )}

      {/* Floating toolbar */}
      <div className="absolute top-3 left-3 z-10 flex gap-2">
        <button
          onClick={addBlankNode}
          className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm hover:border-indigo-400 hover:text-indigo-600 transition"
        >
          <PlusCircle size={13} />
          Add Node
        </button>
        <button
          onClick={saveFlow}
          className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm hover:bg-emerald-100 hover:border-emerald-400 transition"
        >
          <CheckCircle size={13} />
          Aprovar
        </button>
        <div className="relative group">
          <button className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm hover:border-indigo-400 hover:text-indigo-600 transition">
            <Download size={13} />
            Export
          </button>
          <div className="absolute top-full left-0 mt-1 w-36 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all z-20">
            <button onClick={handleExportPng} className="w-full text-left text-xs font-medium text-slate-600 px-3 py-2 hover:bg-slate-50">
              Export as PNG
            </button>
            <button onClick={handleExportSvg} className="w-full text-left text-xs font-medium text-slate-600 px-3 py-2 hover:bg-slate-50">
              Export as SVG
            </button>
          </div>
        </div>
      </div>

      {simulationMode && (
        <div className="absolute top-3 right-3 z-10 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm pointer-events-none">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Modo Edição Ativo — alterações não publicadas
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.3}
        maxZoom={1.8}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="#cbd5e1"
        />
        <Controls
          showInteractive={false}
          className="!bottom-4 !left-4 !top-auto !shadow-bento !rounded-xl !border !border-slate-200 !bg-white"
        />
        <MiniMap
          nodeColor={(n) => {
            const s = n.data?.state
            if (s === 'simulation') return '#10B981'
            if (s === 'draft') return '#F59E0B'
            if (s === 'error') return '#EF4444'
            return '#4F46E5'
          }}
          className="!bottom-4 !right-4 !top-auto !rounded-xl !border !border-slate-200 !shadow-bento"
          pannable
          zoomable
        />
      </ReactFlow>
    </div>
  )
}

export default function Canvas() {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlowProvider>
        <FlowCanvas />
      </ReactFlowProvider>
    </div>
  )
}
