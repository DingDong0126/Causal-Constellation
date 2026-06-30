'use client'
import { useEffect, useState, useCallback } from 'react'
import StarGraph from '@/components/StarGraph'
import type { CausalGraph } from '@/lib/types'

export default function Home() {
  const [graph, setGraph] = useState<CausalGraph | null>(null)
  const [universe, setUniverse] = useState(false)
  const [whatIfDeltas, setWhatIfDeltas] = useState<Record<string, number> | null>(null)

  useEffect(() => {
    fetch('/api/graph/demo').then((r) => r.json()).then(setGraph)
  }, [])

  const runWhatIf = useCallback(async (overrides: Record<string, number>) => {
    if (!graph) return
    const res = await fetch('/api/whatif', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ graph, overrides }),
    })
    const data = await res.json()
    setWhatIfDeltas(data.deltas)
  }, [graph])

  const onEdgeWeightChange = useCallback((edgeId: string, w: number) => {
    setGraph((g) => g ? { ...g, edges: g.edges.map((e) => e.edge_id === edgeId ? { ...e, weight: w } : e) } : g)
  }, [])
  const onEdgeDelete = useCallback((edgeId: string) => {
    setGraph((g) => g ? { ...g, edges: g.edges.filter((e) => e.edge_id !== edgeId) } : g)
  }, [])
  const onEdgeConfirm = useCallback((edgeId: string) => {
    setGraph((g) => g ? { ...g, edges: g.edges.map((e) => e.edge_id === edgeId ? { ...e, source: 'user_confirmed' as const } : e) } : g)
  }, [])

  if (!graph) return <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',color:'#8b95b3' }}>正在点亮星图…</div>

  return (
    <main style={{ position: 'relative', filter: universe ? 'hue-rotate(40deg) saturate(1.3)' : 'none', transition: 'filter 0.6s' }}>
      <header style={{ position:'absolute',top:0,left:0,right:0,zIndex:20,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'18px 24px',pointerEvents:'none' }}>
        <div style={{ pointerEvents:'auto' }}>
          <h1 style={{ fontSize:18,fontWeight:600 }}>因果星图</h1>
          <p style={{ fontSize:11,color:'#8b95b3' }}>Causal Constellation · {graph.nodes.length} 个节点</p>
        </div>
        <button className="universe-toggle" style={{ pointerEvents:'auto' }} onClick={() => setUniverse((u) => !u)}>
          {universe ? '← 回到现实' : '✨ 平行宇宙'}
        </button>
      </header>
      <StarGraph graph={graph} onEdgeWeightChange={onEdgeWeightChange}
        onEdgeDelete={onEdgeDelete} onEdgeConfirm={onEdgeConfirm} whatIfDeltas={whatIfDeltas} />
    </main>
  )
}
