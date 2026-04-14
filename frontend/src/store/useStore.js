import { create } from 'zustand'

const API = '/api'

// ─── Seed data ────────────────────────────────────────────────────────────────
const SEED_PID = '1'

const SEED_NODES = [
  { id: '1', type: 'custom', position: { x: 250, y: 50 },
    data: { label: 'Chegada do Caminhão', step: 'Etapa 01', bpmnType: 'start',
            description: 'Motorista apresenta documentação na portaria.', state: 'production' } },
  { id: '2', type: 'custom', position: { x: 250, y: 230 },
    data: { label: 'Conferência de Notas (DANFE)', step: 'Etapa 02', bpmnType: 'task',
            description: 'Operador valida NF-e contra pedido de compra.', state: 'production' } },
  { id: '3', type: 'custom', position: { x: 250, y: 410 },
    data: { label: 'Descarga com Biometria', step: 'Etapa 03', bpmnType: 'task',
            description: 'Validação biométrica do motorista na doca.', state: 'simulation' } },
]
const SEED_EDGES = [
  { id: 'e1-2', source: '1', target: '2', type: 'custom' },
  { id: 'e2-3', source: '2', target: '3', type: 'custom' },
]

const INITIAL_CHAT_HISTORIES = {
  [SEED_PID]: [
    { id: 'w1', role: 'ai',
      text: 'Olá! Estou monitorando o processo **Recebimento de Carga**. Clique nas setas do canvas para analisar transições, ou faça perguntas sobre este fluxo.' },
  ],
}

const T0 = '2026-03-12T09:00:00Z'
const T1 = '2026-03-12T09:01:30Z'
const T2 = new Date(Date.now() - 3600000).toISOString()

const INITIAL_ACTIVITY_LOGS = {
  [SEED_PID]: [
    { id: 'a1', type: 'create',   text: 'Processo criado — Logística Operacional',       ts: T0 },
    { id: 'a2', type: 'import',   text: 'IT-045_v2.docx importado',                      ts: T0 },
    { id: 'a3', type: 'generate', text: 'Diagrama gerado pela IA — 3 etapas extraídas',  ts: T1 },
    { id: 'a4', type: 'import',   text: 'IT-045_v3.docx importado',                      ts: T2 },
    { id: 'a5', type: 'diff',     text: '1 divergência encontrada com o diagrama atual', ts: T2 },
  ],
}

// ─── Store ────────────────────────────────────────────────────────────────────
const useStore = create((set, get) => ({

  // ── Canvas ─────────────────────────────────────────────────────────────────
  nodes: [],
  edges: [],
  simulationMode: false,
  importing: false,
  generating: false,

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  toggleSimulationMode: () => {
    const next = !get().simulationMode
    set({ simulationMode: next })
    get().logActivity('sandbox', next ? 'Modo Sandbox ativado' : 'Modo Sandbox desativado')
    if (next) {
      get().addChatMessage({ role: 'ai', text: '**Modo Sandbox Ativado.** Edite, mova e delete nós ou rompa conexões. Nada afeta a Produção até ser validado.' })
      set({ activeTab: 'chat' })
    }
  },

  updateNodeData: (nodeId, patch) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n
      ),
    })),

  addNode: (node) => set((s) => ({ nodes: [...s.nodes, node] })),

  removeNode: (nodeId) => {
    const label = get().nodes.find((n) => n.id === nodeId)?.data?.label || nodeId
    get().logActivity('delete', `Nó "${label}" removido`)
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== nodeId),
      edges: s.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
    }))
  },

  removeEdge: (edgeId) => {
    get().logActivity('delete', 'Conexão removida no Sandbox')
    set((s) => ({ edges: s.edges.filter((e) => e.id !== edgeId) }))
  },

  // ── Processes / Workspaces ─────────────────────────────────────────────────
  workspaces: [],
  currentWorkspace: null,
  processes: [],
  currentProcess: null,

  loadWorkspaces: async () => {
    try {
      const res = await fetch(`${API}/processes/workspaces`)
      if (!res.ok) return
      const data = await res.json()
      if (data.length > 0) {
        set((s) => ({
          workspaces: data,
          currentWorkspace: s.currentWorkspace ?? data[0].id,
        }))
      }
    } catch (_) {}
  },

  loadProcesses: async () => {
    try {
      const res = await fetch(`${API}/processes/`)
      if (!res.ok) return
      const data = await res.json()
      set({ processes: data })
    } catch (_) {}
  },

  setCurrentWorkspace: (id) => set({ currentWorkspace: id }),

  setCurrentProcess: (p) => {
    const pid = String(p?.id ?? '')
    const histories = get().chatHistories
    const update = { currentProcess: p, chatContext: null, pendingChanges: [] }
    if (pid && !histories[pid]) {
      update.chatHistories = {
        ...histories,
        [pid]: [{ id: `w-${pid}`, role: 'ai',
          text: `Processo **${p.name}** selecionado. Importe um documento e clique em **Gerar Diagrama com IA** para criar o fluxo automaticamente.` }],
      }
    }
    set(update)
  },

  createProcess: async ({ name, sector, workspaceId }) => {
    const pid = String(workspaceId || get().currentWorkspace)
    try {
      const res = await fetch(`${API}/processes/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, sector, workspace_id: workspaceId || get().currentWorkspace }),
      })
      if (!res.ok) throw new Error()
      const p = await res.json()
      set((s) => ({ processes: [p, ...s.processes] }))
      // Select it and init its empty state
      get().setCurrentProcess(p)
      get().loadProcessFlow(p.id)
      get().logActivity('create', `Processo criado — ${sector || 'sem setor'}`)
      return p
    } catch {
      // Fallback: create locally with a temp id
      const tempId = Date.now()
      const p = { id: tempId, name, sector, workspace_id: workspaceId || get().currentWorkspace,
        flow_json: '{"nodes":[],"edges":[]}', source_doc: null,
        updated_by: 'User', updated_at: new Date().toISOString() }
      set((s) => ({ processes: [p, ...s.processes] }))
      get().setCurrentProcess(p)
      set({ nodes: [], edges: [] })
      return p
    }
  },

  deleteProcess: async (processId) => {
    try {
      await fetch(`${API}/processes/${processId}`, { method: 'DELETE' })
    } catch (_) {}
    set((s) => {
      const remaining = s.processes.filter((p) => p.id !== processId)
      const nextProcess = s.currentProcess?.id === processId
        ? (remaining[0] ?? null)
        : s.currentProcess
      return {
        processes: remaining,
        currentProcess: nextProcess,
        nodes: nextProcess?.id === processId ? [] : s.nodes,
        edges: nextProcess?.id === processId ? [] : s.edges,
      }
    })
    // Load the next process if one exists
    const next = get().currentProcess
    if (next?.id && next.id !== processId) {
      get().loadProcessFlow(next.id)
    } else if (!next) {
      set({ nodes: [], edges: [] })
    }
  },

  loadProcessFlow: async (processId) => {
    set({ nodes: [], edges: [] })
    try {
      const res = await fetch(`${API}/processes/${processId}`)
      if (!res.ok) return
      const data = await res.json()
      const flow = JSON.parse(data.flow_json || '{"nodes":[],"edges":[]}')
      set({ nodes: flow.nodes || [], edges: flow.edges || [], currentProcess: data })
    } catch (_) {}
  },

  saveFlow: async (updatedBy) => {
    const { currentProcess, nodes, edges } = get()
    if (!currentProcess?.id) return
    const body = { flow_json: JSON.stringify({ nodes, edges }) }
    if (updatedBy) body.updated_by = updatedBy
    await fetch(`${API}/processes/${currentProcess.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => {})
    get().logActivity('approve', `Diagrama aprovado e salvo — ${nodes.length} etapa(s)`)
  },

  // ── Versions ───────────────────────────────────────────────────────────────
  versions: [
    { id: 1, version_tag: 'v2.1', author: 'Danyel', sector: 'Logística',
      process_name: 'Recebimento de Carga', published_at: new Date().toISOString() },
    { id: 2, version_tag: 'v2.0', author: 'Danyel', sector: 'Logística',
      process_name: 'Recebimento de Carga', published_at: '2026-03-12T00:00:00Z' },
  ],

  publishVersion: async ({ versionTag, author = 'User', processName, sector }) => {
    const { currentProcess } = get()
    if (!currentProcess?.id) return
    await get().saveFlow(author)
    if (processName && processName !== currentProcess.name) {
      await fetch(`${API}/processes/${currentProcess.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: processName, sector }),
      }).catch(() => {})
      set((s) => ({
        currentProcess: { ...s.currentProcess, name: processName, sector },
        processes: s.processes.map((p) =>
          p.id === currentProcess.id ? { ...p, name: processName, sector } : p
        ),
      }))
    }
    try {
      const res = await fetch(`${API}/versions/publish`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ process_id: currentProcess.id, version_tag: versionTag,
          author, process_name: processName || currentProcess.name, sector }),
      })
      const v = await res.json()
      set((s) => ({ versions: [v, ...s.versions] }))
      get().logActivity('publish', `${versionTag} publicada por ${author}`)
    } catch (_) {}
  },

  loadVersions: async (processId) => {
    try {
      const res = await fetch(`${API}/versions/process/${processId}`)
      if (!res.ok) return
      const data = await res.json()
      if (data.length > 0) set({ versions: data })
    } catch (_) {}
  },

  restoreVersion: async (versionId) => {
    try {
      const res = await fetch(`${API}/versions/${versionId}`)
      if (!res.ok) return
      const v = await res.json()
      const flow = JSON.parse(v.flow_json || '{"nodes":[],"edges":[]}')
      set({ nodes: flow.nodes || [], edges: flow.edges || [] })
      get().logActivity('publish', `Canvas restaurado para ${v.version_tag}`)
    } catch (_) {}
  },

  // ── Per-process chat ───────────────────────────────────────────────────────
  chatHistories: INITIAL_CHAT_HISTORIES,
  chatContext: null,
  aiLoading: false,
  activeTab: 'chat',

  setActiveTab: (tab) => set({ activeTab: tab }),
  setChatContext: (ctx) => set({ chatContext: ctx }),

  addChatMessage: (msg) => {
    const pid = String(get().currentProcess?.id ?? '')
    if (!pid) return
    set((s) => ({
      chatHistories: {
        ...s.chatHistories,
        [pid]: [...(s.chatHistories[pid] || []),
          { id: `${Date.now()}-${Math.random()}`, ...msg }],
      },
    }))
  },

  sendChatMessage: async (text) => {
    const { currentProcess, chatContext } = get()
    get().addChatMessage({ role: 'user', text })
    set({ aiLoading: true })
    try {
      const res = await fetch(`${API}/ai/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ process_id: currentProcess?.id ?? null, message: text, context: chatContext }),
      })
      get().addChatMessage({ role: 'ai', text: (await res.json()).answer })
    } catch {
      get().addChatMessage({ role: 'ai', text: 'Erro ao contactar o servidor. Verifique se o backend está rodando.' })
    } finally {
      set({ aiLoading: false })
    }
  },

  // ── Per-process activity log ───────────────────────────────────────────────
  activityLogs: INITIAL_ACTIVITY_LOGS,

  logActivity: (type, text) => {
    const pid = String(get().currentProcess?.id ?? '')
    if (!pid) return
    set((s) => ({
      activityLogs: {
        ...s.activityLogs,
        [pid]: [...(s.activityLogs[pid] || []),
          { id: `act-${Date.now()}`, type, text, ts: new Date().toISOString() }],
      },
      // also update process updated_at/updated_by in list
      processes: s.processes.map((p) =>
        p.id === Number(pid)
          ? { ...p, updated_at: new Date().toISOString() }
          : p
      ),
    }))
  },

  // ── Pending changes (diff review) ─────────────────────────────────────────
  pendingChanges: [
    { id: 'demo-1', action: 'ADD', node_id: null,
      title: 'Descarga com Biometria',
      description: 'Segundo a IT-045_v3, o motorista deve validar biometria na doca antes do início da descarga.',
      new_data: { label: 'Descarga com Biometria', step: 'Etapa 03', bpmnType: 'task',
                  description: 'Validação biométrica do motorista na doca.', state: 'simulation' } },
  ],
  diffLoading: false,

  runDiff: async (documentId) => {
    const { currentProcess } = get()
    if (!currentProcess?.id) return
    set({ diffLoading: true })
    try {
      const res = await fetch(`${API}/ai/diff`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ process_id: currentProcess.id, document_id: documentId }),
      })
      const changes = (await res.json()).changes || []
      set({ pendingChanges: changes, activeTab: 'status' })
      get().logActivity('diff',
        changes.length > 0
          ? `${changes.length} divergência(s) detectada(s) — aguardando aprovação`
          : 'Análise concluída — sem divergências')
    } catch {
      set({ pendingChanges: [] })
    } finally {
      set({ diffLoading: false })
    }
  },

  approveChange: (changeId) => {
    const change = get().pendingChanges.find((c) => c.id === changeId)
    if (!change) return
    if (change.action === 'ADD' && change.new_data) {
      get().addNode({ id: `node-${Date.now()}`, type: 'custom',
        position: { x: 250, y: (get().nodes.length + 1) * 180 },
        data: { bpmnType: 'task', ...change.new_data, state: 'simulation' } })
    } else if (change.action === 'UPDATE' && change.node_id) {
      get().updateNodeData(change.node_id, { ...change.new_data, state: 'simulation' })
    } else if (change.action === 'DELETE' && change.node_id) {
      get().removeNode(change.node_id)
    }
    get().logActivity('approve', `Aprovado: "${change.title}"`)
    set((s) => ({ pendingChanges: s.pendingChanges.filter((c) => c.id !== changeId) }))
  },

  ignoreChange: (changeId) => {
    const change = get().pendingChanges.find((c) => c.id === changeId)
    get().logActivity('reject', `Ignorado: "${change?.title || changeId}"`)
    set((s) => ({ pendingChanges: s.pendingChanges.filter((c) => c.id !== changeId) }))
  },

  // ── Documents ──────────────────────────────────────────────────────────────
  documents: [],

  loadDocuments: async (processId) => {
    if (!processId) return
    try {
      const res = await fetch(`${API}/documents/process/${processId}`)
      if (!res.ok) return
      set({ documents: await res.json() })
    } catch (_) {}
  },

  /** Upload a file without triggering generation — just attach it to the process */
  uploadDocument: async (file) => {
    const { currentProcess } = get()
    set({ importing: true })
    const formData = new FormData()
    formData.append('file', file)
    if (currentProcess?.id) formData.append('process_id', currentProcess.id.toString())
    try {
      const res = await fetch(`${API}/documents/upload`, { method: 'POST', body: formData })
      if (!res.ok) throw new Error()
      const uploaded = await res.json()
      get().logActivity('import', `"${file.name}" importado`)
      if (currentProcess?.id) await get().loadDocuments(currentProcess.id)
      get().addChatMessage({ role: 'ai',
        text: `📄 **${file.name}** anexado. Clique em **Gerar Diagrama com IA** na aba Status para criar o fluxo.` })
      return uploaded
    } catch {
      get().addChatMessage({ role: 'ai', text: '❌ Erro ao fazer upload. Verifique se o backend está rodando.' })
      return null
    } finally {
      set({ importing: false })
    }
  },

  /** Read all attached documents and generate/update the diagram via AI */
  generateDiagram: async () => {
    const { currentProcess, documents } = get()
    if (!currentProcess?.id) return
    if (documents.length === 0) {
      get().addChatMessage({ role: 'ai', text: '⚠️ Nenhum documento anexado. Importe um arquivo primeiro.' })
      return
    }
    set({ generating: true })
    get().addChatMessage({ role: 'ai', text: `🤖 Lendo ${documents.length} documento(s) e gerando diagrama...` })
    get().logActivity('generate', 'Geração de diagrama iniciada')

    // Use the most recent document
    const doc = documents[documents.length - 1]
    const hasNodes = get().nodes.length > 0

    try {
      if (!hasNodes) {
        // Generate from scratch
        const res = await fetch(`${API}/ai/generate-flow`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ process_id: currentProcess.id, document_id: doc.id }),
        })
        if (res.ok) {
          const flow = await res.json()
          if (flow.nodes?.length > 0) {
            set({ nodes: flow.nodes, edges: flow.edges || [] })
            get().logActivity('generate', `Diagrama criado — ${flow.nodes.length} etapas, ${(flow.edges || []).length} conexões`)
            get().addChatMessage({ role: 'ai',
              text: `✅ Diagrama gerado com **${flow.nodes.length} etapas**. Revise e publique quando estiver pronto.` })
          }
        }
      } else {
        // Diff against existing
        await get().runDiff(doc.id)
        get().addChatMessage({ role: 'ai',
          text: '📋 Divergências detectadas na aba **Status**. Aprove as mudanças sugeridas.' })
        set({ activeTab: 'status' })
      }
    } catch {
      get().addChatMessage({ role: 'ai', text: '❌ Erro ao gerar diagrama.' })
    } finally {
      set({ generating: false })
    }
  },

  deleteDocument: async (documentId) => {
    try {
      await fetch(`${API}/documents/${documentId}`, { method: 'DELETE' })
      set((s) => ({ documents: s.documents.filter((d) => d.id !== documentId) }))
      get().logActivity('delete', 'Documento excluído')
    } catch (_) {}
  },
}))

export default useStore
