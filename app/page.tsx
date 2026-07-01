'use client'
import { useState, useCallback } from 'react'
import StarGraph from '@/components/StarGraph'
import WelcomeScreen from '@/components/WelcomeScreen'
import type { CausalGraph, GraphNode, GraphEdge } from '@/lib/types'

type Stage = 'welcome' | 'listening' | 'graph'

function deepCopy<T>(o: T): T {
  return typeof structuredClone === 'function' ? structuredClone(o) : JSON.parse(JSON.stringify(o))
}

export default function HomePage() {
  const [stage, setStage] = useState<Stage>('welcome')
  const [realGraph, setRealGraph] = useState<CausalGraph | null>(null)
  const [parallelGraph, setParallelGraph] = useState<CausalGraph | null>(null)
  const [baseline, setBaseline] = useState<CausalGraph | null>(null)
  const [universeMode, setUniverseMode] = useState(false)
  const [whatIfDeltas, setWhatIfDeltas] = useState<Record<string, number> | null>(null)

  const currentGraph = universeMode ? parallelGraph : realGraph

  const updateCurrent = useCallback((updater: (g: CausalGraph) => CausalGraph) => {
    if (universeMode) setParallelGraph((p) => (p ? updater(p) : p))
    else setRealGraph((r) => (r ? updater(r) : r))
  }, [universeMode])

  const handleStart = useCallback(async (text: string) => {
    setStage('listening')
    try {
      const resp = await fetch('/api/intake', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = await resp.json()
      setRealGraph(data)
      setStage('graph')
    } catch (e) { console.error(e); setStage('welcome') }
  }, [])

  const enterUniverse = useCallback(() => {
    if (!realGraph) return
    setParallelGraph(deepCopy(realGraph))
    setBaseline(deepCopy(realGraph))
    setWhatIfDeltas(null)
    setUniverseMode(true)
  }, [realGraph])

  const exitUniverse = useCallback(() => {
    setUniverseMode(false)
    setParallelGraph(null)
    setBaseline(null)
    setWhatIfDeltas(null)
  }, [])

  const handleEdgeWeightChange = useCallback(async (edgeId: string, newWeight: number) => {
    updateCurrent((g) => ({ ...g, edges: g.edges.map((e) => e.edge_id === edgeId ? { ...e, weight: newWeight } : e) }))
    if (universeMode && parallelGraph) {
      try {
        const next = { ...parallelGraph, edges: parallelGraph.edges.map((e) => e.edge_id === edgeId ? { ...e, weight: newWeight } : e) }
        const resp = await fetch('/api/whatif', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ graph: { nodes: next.nodes, edges: next.edges }, intervention_edge_id: edgeId, new_weight: newWeight }),
        })
        const result = await resp.json()
        setWhatIfDeltas(result.deltas)
      } catch (e) { console.error(e) }
    }
  }, [universeMode, parallelGraph, updateCurrent])

  const handleEdgeDelete = useCallback((edgeId: string) => {
    updateCurrent((g) => ({ ...g, edges: g.edges.filter((e) => e.edge_id !== edgeId) }))
  }, [updateCurrent])
  const handleEdgeConfirm = useCallback((edgeId: string) => {
    updateCurrent((g) => ({ ...g, edges: g.edges.map((e) => e.edge_id === edgeId ? { ...e, source: 'user_confirmed' } : e) }))
  }, [updateCurrent])

  const handleNodeAdd = useCallback((node: GraphNode) => {
    updateCurrent((g) => ({ ...g, nodes: [...g.nodes, node] }))
  }, [updateCurrent])
  const handleNodeDelete = useCallback((nodeId: string) => {
    updateCurrent((g) => ({
      ...g,
      nodes: g.nodes.filter((n) => n.node_id !== nodeId),
      edges: g.edges.filter((e) => e.source_node_id !== nodeId && e.target_node_id !== nodeId),
    }))
  }, [updateCurrent])

  // —— 牵引一道引力（加边） ——
  const handleEdgeAdd = useCallback((edge: GraphEdge) => {
    updateCurrent((g) => {
      // 防重复：同一对星之间已存在则不重复添加
      const dup = g.edges.some((e) =>
        (e.source_node_id === edge.source_node_id && e.target_node_id === edge.target_node_id) ||
        (e.source_node_id === edge.target_node_id && e.target_node_id === edge.source_node_id))
      if (dup) return g
      return { ...g, edges: [...g.edges, edge] }
    })
  }, [updateCurrent])

  if (stage === 'welcome') return <WelcomeScreen onSubmit={handleStart} />

  if (stage === 'listening') return (
    <div className="listening">
      <div className="listening-pulse" />
      <p className="listening-text">我在听……正在把你的故事点亮成星图</p>
    </div>
  )

  return (
    <div className={`app${universeMode ? ' universe-mode' : ''}`}
      style={{ position: 'relative', height: '100vh', width: '100vw', transition: 'filter 0.8s ease', filter: universeMode ? 'hue-rotate(40deg) saturate(1.2)' : 'none' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', pointerEvents: 'none' }}>
        <div style={{ pointerEvents: 'auto' }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, letterSpacing: '2px', background: 'linear-gradient(90deg, #7c9cff, #ff9eb5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>因果星图</h1>
          <p style={{ fontSize: 11, color: '#8b95b3', marginTop: 2, letterSpacing: '1px' }}>CAUSAL CONSTELLATION · 与 AI 协作共建的人生因果图</p>
        </div>
        <div className={`universe-toggle${universeMode ? ' active' : ''}`} onClick={universeMode ? exitUniverse : enterUniverse}
          style={{ pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', background: 'rgba(18,24,42,0.82)', border: `1px solid ${universeMode ? '#a78bfa' : 'rgba(120,140,200,0.18)'}`, borderRadius: 24, backdropFilter: 'blur(12px)', fontSize: 12, cursor: 'pointer', boxShadow: universeMode ? '0 0 20px rgba(167,139,250,0.4)' : 'none' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: universeMode ? '#a78bfa' : '#7c9cff', boxShadow: universeMode ? '0 0 8px #a78bfa' : 'none' }} />
          {universeMode ? '平行宇宙 · 点击返回真实' : '真实宇宙 · 点击进入平行宇宙'}
        </div>
      </div>

      {universeMode && (
        <div style={{ position: 'absolute', top: 64, left: '50%', transform: 'translateX(-50%)', zIndex: 9, fontSize: 12, color: '#a78bfa', letterSpacing: '1px', background: 'rgba(167,139,250,0.1)', padding: '6px 16px', borderRadius: 16, border: '1px solid rgba(167,139,250,0.3)' }}>
          ✦ 平行宇宙 —— 在这里点亮或隐去星辰、牵引或修正星轨，都不会影响真实的你；退出即散去
        </div>
      )}

      {currentGraph && (
        <StarGraph graph={currentGraph} onEdgeWeightChange={handleEdgeWeightChange} onEdgeDelete={handleEdgeDelete} onEdgeConfirm={handleEdgeConfirm} onNodeAdd={handleNodeAdd} onNodeDelete={handleNodeDelete} onEdgeAdd={handleEdgeAdd} whatIfDeltas={whatIfDeltas} />
      )}

      <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 10, display: 'flex', gap: 18, padding: '10px 20px', background: 'rgba(18,24,42,0.82)', border: '1px solid rgba(120,140,200,0.18)', borderRadius: 24, backdropFilter: 'blur(12px)', fontSize: 11, color: '#8b95b3' }}>
        <Legend color="#ff9eb5" label="正向" />
        <Legend color="#a78bfa" label="复杂 / 沉重" />
        <Legend color="#6b7494" label="时间主干" />
        <span>{universeMode ? '在副本上自由假设' : '如实校正 · 持久保存'}</span>
      </div>
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />{label}</span>
}
