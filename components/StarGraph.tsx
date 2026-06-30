'use client'
import { useRef, useState, useCallback, useMemo, useEffect } from 'react'
import dynamic from 'next/dynamic'
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false })
import type React from 'react'
import type { CausalGraph, GraphNode, GraphEdge } from '@/lib/types'

const VALENCE_COLOR: Record<string, string> = {
  positive: '#ff9eb5', complex: '#a78bfa', heavy: '#9d7cf0', neutral: '#6b7494',
}
const SPINE_COLOR = '#6b7494'

interface FGNode extends GraphNode { id: string; x?: number; y?: number }
interface FGLink extends Omit<GraphEdge, 'source'> { source: string | FGNode; target: string | FGNode }

export default function StarGraph({ graph, onEdgeWeightChange, onEdgeDelete, onEdgeConfirm, whatIfDeltas }: {
  graph: CausalGraph
  onEdgeWeightChange: (edgeId: string, newWeight: number) => void
  onEdgeDelete: (edgeId: string) => void
  onEdgeConfirm: (edgeId: string) => void
  whatIfDeltas: Record<string, number> | null
}) {
  const fgRef = useRef<any>(null)
  const [hoverNode, setHoverNode] = useState<string | null>(null)
  const [selected, setSelected] = useState<
    | { kind: 'node'; data: GraphNode }
    | { kind: 'edge'; data: GraphEdge; tempWeight: number }
    | null
  >(null)

  const fgData = useMemo(() => ({
    nodes: graph.nodes.map((n) => ({ ...n, id: n.node_id })) as FGNode[],
    links: graph.edges.map((e) => ({ ...e, source: e.source_node_id, target: e.target_node_id })) as FGLink[],
  }), [graph])

  const adjacency = useMemo(() => {
    const map: Record<string, Set<string>> = {}
    graph.edges.forEach((e) => {
      ;(map[e.source_node_id] ||= new Set()).add(e.target_node_id)
      ;(map[e.target_node_id] ||= new Set()).add(e.source_node_id)
    })
    return map
  }, [graph])

  const isHighlighted = useCallback((id: string) => {
    if (!hoverNode) return true
    if (id === hoverNode) return true
    return adjacency[hoverNode]?.has(id) ?? false
  }, [hoverNode, adjacency])

  const drawNode = useCallback((node: FGNode, ctx: CanvasRenderingContext2D, gs: number) => {
    const x = node.x ?? 0, y = node.y ?? 0
    const isSpine = node.type === 'spine'
    const color = isSpine ? SPINE_COLOR : (VALENCE_COLOR[node.valence] || SPINE_COLOR)
    const dim = hoverNode !== null && !isHighlighted(node.id)
    const r = isSpine ? 6 : 5
    ctx.globalAlpha = dim ? 0.15 : 1
    if (!isSpine && !dim) {
      const g = ctx.createRadialGradient(x, y, r, x, y, r * 3)
      g.addColorStop(0, color + '55'); g.addColorStop(1, color + '00')
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 3, 0, 2 * Math.PI); ctx.fill()
    }
    if (whatIfDeltas?.[node.id] !== undefined) {
      const d = whatIfDeltas[node.id]
      if (Math.abs(d) > 0.01) {
        ctx.strokeStyle = d > 0 ? '#7cffb5' : '#ff7c7c'
        ctx.lineWidth = 2 / gs; ctx.beginPath(); ctx.arc(x, y, r + 4, 0, 2 * Math.PI); ctx.stroke()
      }
    }
    ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.fillStyle = color; ctx.fill()
    ctx.lineWidth = 1.5 / gs
    if (node.source === 'ai_inferred') { ctx.setLineDash([2/gs, 2/gs]); ctx.strokeStyle = color + 'aa' }
    else { ctx.setLineDash([]); ctx.strokeStyle = '#ffffffcc' }
    ctx.stroke(); ctx.setLineDash([])
    const fs = Math.max(11 / gs, 2.5)
    ctx.font = `${fs}px -apple-system,sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'top'
    ctx.fillStyle = dim ? '#8b95b355' : '#e8ecf6'; ctx.fillText(node.title, x, y + r + 2)
    ctx.globalAlpha = 1
  }, [hoverNode, isHighlighted, whatIfDeltas])

  const linkColor = useCallback((link: FGLink) => {
    const s = typeof link.source === 'string' ? link.source : (link.source as FGNode).id
    const t = typeof link.target === 'string' ? link.target : (link.target as FGNode).id
    if (hoverNode !== null && !(isHighlighted(s) && isHighlighted(t))) return 'rgba(120,140,200,0.05)'
    if (link.edge_type === 'spine_sequence') return 'rgba(107,116,148,0.6)'
    if (link.source === 'ai_suggested') return 'rgba(124,156,255,0.25)'
    return 'rgba(167,139,250,0.45)'
  }, [hoverNode, isHighlighted])

  const linkWidth = useCallback((l: FGLink) => l.edge_type === 'spine_sequence' ? 2 : Math.max(0.5, l.weight * 3), [])
  const linkLineDash = useCallback((l: FGLink) => l.source === 'ai_suggested' ? [3, 3] : null, [])

  useEffect(() => {
    if (selected?.kind === 'edge')
      setSelected((s) => s?.kind === 'edge' ? { ...s, tempWeight: s.data.weight } : s)
  }, [graph])

  const P = { position: 'absolute' as const, top: 72, right: 20, width: 320, maxHeight: 'calc(100vh - 160px)', overflowY: 'auto' as const, zIndex: 10, background: 'rgba(18,24,42,0.82)', border: '1px solid rgba(120,140,200,0.18)', borderRadius: 16, padding: 20, backdropFilter: 'blur(16px)' }

  return (
    <>
      <div style={{ width: '100vw', height: '100vh' }}>
        <ForceGraph2D ref={fgRef} graphData={fgData} backgroundColor="#0a0e1a"
          nodeCanvasObject={drawNode as any}
          nodePointerAreaPaint={(n: any, c: string, ctx: CanvasRenderingContext2D) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(n.x, n.y, 8, 0, 2 * Math.PI); ctx.fill() }}
          linkColor={linkColor as any} linkWidth={linkWidth as any} linkLineDash={linkLineDash as any}
          onNodeHover={(n: FGNode | null) => setHoverNode(n ? n.id : null)}
          onNodeClick={(n: FGNode) => setSelected({ kind: 'node', data: n })}
          onLinkClick={(l: any) => setSelected({ kind: 'edge', data: l, tempWeight: l.weight })}
          cooldownTicks={100} onEngineStop={() => fgRef.current?.zoomToFit(400, 80)} />
      </div>
      {selected && (
        <div style={P}>
          {selected.kind === 'node' && (
            <>
              <h3 style={{ fontSize: 15, marginBottom: 4 }}>{selected.data.title}</h3>
              <p style={{ fontSize: 11, color: '#8b95b3', marginBottom: 14 }}>{selected.data.date || '时间待补充'} · {catLabel(selected.data.category)}</p>
              <div style={{ marginBottom: 8 }}>
                <Chip>{valLabel(selected.data.valence)}</Chip>
                <Chip>{selected.data.source === 'ai_inferred' ? 'AI 推断·待确认' : '你亲口讲述'}</Chip>
              </div>
              {selected.data.raw_quote && (
                <blockquote style={{ fontSize: 12, color: '#8b95b3', borderLeft: '2px solid #7c9cff', padding: '4px 0 4px 10px', margin: '12px 0', lineHeight: 1.6, fontStyle: 'italic' }}>
                  "{selected.data.raw_quote}"
                </blockquote>
              )}
            </>
          )}
          {selected.kind === 'edge' && (
            <>
              <h3 style={{ fontSize: 15, marginBottom: 4 }}>因果连接</h3>
              <p style={{ fontSize: 11, color: '#8b95b3', marginBottom: 14 }}>
                {etLabel(selected.data.edge_type)} · {selected.data.source === 'ai_suggested' ? 'AI 猜测' : selected.data.source === 'user_created' ? '你新增' : '你已确认'}
              </p>
              <div style={{ padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(120,140,200,0.18)' }}>
                {selected.data.rationale && <p style={{ fontSize: 11, color: '#8b95b3', lineHeight: 1.5, marginBottom: 10 }}>💭 {selected.data.rationale}</p>}
                {(selected.data.edge_type === 'attribution' || selected.data.edge_type === 'causal') ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, color: '#8b95b3' }}>
                      <span>影响很小</span>
                      <input type="range" min={0} max={1} step={0.05} value={selected.tempWeight}
                        style={{ flex: 1, accentColor: '#7c9cff', cursor: 'pointer' }}
                        onChange={(e) => setSelected((s) => s?.kind === 'edge' ? { ...s, tempWeight: +e.target.value } : s)}
                        onMouseUp={(e) => onEdgeWeightChange(selected.data.edge_id, +(e.target as HTMLInputElement).value)} />
                      <span>影响很大</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <button className="btn primary" onClick={() => onEdgeConfirm(selected.data.edge_id)}>认领这条</button>
                      <button className="btn danger" onClick={() => onEdgeDelete(selected.data.edge_id)}>否定删除</button>
                    </div>
                  </>
                ) : <p style={{ fontSize: 11, color: '#8b95b3' }}>主干时间线 · 不可调整</p>}
              </div>
            </>
          )}
          <button className="btn" style={{ marginTop: 12, width: '100%' }} onClick={() => setSelected(null)}>关闭</button>
        </div>
      )}
    </>
  )
}

function catLabel(c: string) { return ({ education:'教育',career:'职业',relationship:'关系',location:'居住',health:'健康',identity:'自我认知',financial:'经济',creative:'创造',external:'外部冲击' } as Record<string,string>)[c] || c }
function valLabel(v: string) { return ({ positive:'正向情绪',complex:'复杂情绪',heavy:'沉重情绪',neutral:'中性' } as Record<string,string>)[v] || v }
function etLabel(t: string) { return ({ spine_sequence:'时间顺序',attribution:'归因',causal:'因果' } as Record<string,string>)[t] || t }
function Chip({ children }: { children?: React.ReactNode }) {
  return <span style={{ display:'inline-block',fontSize:10,padding:'2px 8px',borderRadius:10,marginRight:6,marginBottom:6,border:'1px solid rgba(120,140,200,0.18)',color:'#8b95b3' }}>{children}</span>
}
