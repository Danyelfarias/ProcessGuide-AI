import { useState, useEffect, useRef } from 'react'
import { Send, X, Info, Sparkles, Loader2 } from 'lucide-react'
import useStore from '../../store/useStore'

function ChatMessage({ msg }) {
  const isUser = msg.role === 'user'
  const parseMarkdown = (text) =>
    text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[88%] p-3.5 rounded-2xl text-sm leading-relaxed
          ${isUser
            ? 'bg-indigo-600 text-white rounded-tr-none shadow-sm'
            : 'bg-slate-50 border border-slate-200 text-slate-600 rounded-tl-none'}`}
        dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.text) }}
      />
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl rounded-tl-none flex items-center gap-1.5">
        <Sparkles size={12} className="text-indigo-500" />
        <span className="text-xs text-slate-400 font-medium">Consultando base vetorial...</span>
        <Loader2 size={12} className="text-slate-400 animate-spin" />
      </div>
    </div>
  )
}

export default function ChatPanel() {
  // Read per-process chat history
  const currentProcess = useStore((s) => s.currentProcess)
  const messages = useStore((s) =>
    s.chatHistories[String(s.currentProcess?.id ?? '')]
  ) ?? []
  const aiLoading      = useStore((s) => s.aiLoading)
  const sendChatMessage = useStore((s) => s.sendChatMessage)
  const chatContext    = useStore((s) => s.chatContext)
  const setChatContext = useStore((s) => s.setChatContext)

  const [input, setInput] = useState('')
  const bottomRef = useRef(null)

  // Scroll to bottom when messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, aiLoading])

  // Clear input when process switches
  useEffect(() => {
    setInput('')
  }, [currentProcess?.id])

  const handleSend = () => {
    const text = input.trim()
    if (!text || aiLoading) return
    setInput('')
    sendChatMessage(text)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex-1 flex flex-col p-4 min-h-0">
      {/* Process context chip */}
      {currentProcess && (
        <div className="mb-3 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
          <span className="text-xs text-slate-500 font-medium truncate">
            {currentProcess.name}
          </span>
        </div>
      )}

      {/* Transition/node context banner */}
      {chatContext && (
        <div className="mb-3 bg-indigo-50 border border-indigo-100 px-3 py-2 rounded-lg flex items-center justify-between">
          <span className="text-xs text-indigo-700 font-semibold flex items-center gap-1.5 truncate">
            <Info size={12} className="shrink-0" />
            {chatContext}
          </span>
          <button onClick={() => setChatContext(null)} className="text-indigo-300 hover:text-indigo-700 ml-2 shrink-0">
            <X size={13} />
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} msg={msg} />
        ))}
        {aiLoading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="mt-4 relative">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Pergunte sobre ${currentProcess?.name ?? 'este processo'}...`}
          disabled={aiLoading}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm transition disabled:opacity-60"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || aiLoading}
          className="absolute right-2 top-1.5 w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center shadow hover:bg-indigo-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {aiLoading ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
        </button>
      </div>
    </div>
  )
}
