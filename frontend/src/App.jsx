import { useEffect } from 'react'
import LeftSidebar from './components/LeftSidebar/LeftSidebar'
import Header from './components/Header/Header'
import Canvas from './components/Canvas/Canvas'
import RightSidebar from './components/RightSidebar/RightSidebar'
import useStore from './store/useStore'

export default function App() {
  const loadWorkspaces = useStore((s) => s.loadWorkspaces)
  const loadProcesses  = useStore((s) => s.loadProcesses)

  useEffect(() => {
    loadWorkspaces()
    loadProcesses()
  }, [])

  return (
    <div className="h-screen w-full flex overflow-hidden bg-[#F8F9FB]">
      {/* Left Sidebar */}
      <LeftSidebar />

      {/* Center: Header + Canvas */}
      <main className="flex-1 flex flex-col pt-4 pb-4 min-w-0">
        <Header />
        <div className="flex-1 m-4 rounded-2xl border border-slate-200 shadow-inner relative overflow-hidden bg-white/50">
          <Canvas />
        </div>
      </main>

      {/* Right Sidebar */}
      <RightSidebar />
    </div>
  )
}
