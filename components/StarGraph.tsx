'use client'
import { useRef, useState, useCallback, useMemo, useEffect } from 'react'
import dynamic from 'next/dynamic'
const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), { ssr: false })
import type React from 'react'
import type { CausalGraph, GraphNode, GraphEdge } from '@/lib/types'

const VALENCE_COLOR: Record<string, string> = {
  positive: '#ff9eb5', complex: '#a78bfa', heavy: '#9d7cf0', neutral: '#8b95b3',
}
const SPINE_COLOR = '#aab4d4'
const GRAY = '#7c87a8'
const DIM = '#2a3147'

interface FGNode extends GraphNode { id: string }
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

  const { neighbors, nodeLinks } = useMemo(() => {
    const nb: Record<string, Set<string>> = {}
    const nl: Record<string, Set<string>> = {}
    graph.edges.forEach((e) => {
      ;(nb[e.source_node_id] ||= new Set()).add(e.target_node_id)
      ;(nb[e.target_node_id] ||= new Set()).add(e.source_node_id)
      ;(nl[e.source_node_id] ||= new Set()).add(e.edge_id)
      ;(nl[e.target_node_id] ||= new Set()).add(e.edge_id)
    })
    return { neighbors: nb, nodeLinks: nl }
  }, [graph])

  const degree = useMemo(() => {
    const d: Record<string, number> = {}
    graph.edges.forEach((e) => { d[e.source_node_id] = (d[e.source_node_id]||0)+1; d[e.target_node_id] = (d[e.target_node_id]||0)+1 })
    return d
  }, [graph])

  const isHiNode = useCallback((id: string) => !hoverNode || id === hoverNode || (neighbors[hoverNode]?.has(id) ?? false), [hoverNode, neighbors])
  const isHiLink = useCallback((edgeId: string) => !hoverNode || (nodeLinks[hoverNode]?.has(edgeId) ?? false), [hoverNode, nodeLinks])

  const nodeColor = useCallback((n: FGNode) => {
    if (whatIfDeltas?.[n.id] !== undefined && Math.abs(whatIfDeltas[n.id]) > 0.01)
      return whatIfDeltas[n.id] > 0 ? '#7cffb5' : '#ff7c7c'
    if (!hoverNode) return GRAY
    if (!isHiNode(n.id)) return DIM
    return n.type === 'spine' ? SPINE_COLOR : (VALENCE_COLOR[n.valence] || GRAY)
  }, [hoverNode, isHiNode, whatIfDeltas])

  const linkColor = useCallback((l: FGLink) => {
    if (!hoverNode) return 'rgba(200,210,235,0.55)'
    if (!isHiLink(l.edge_id)) return 'rgba(120,140,200,0.08)'
    if (l.edge_type === 'spine_sequence') return 'rgba(220,228,248,1)'
    return 'rgba(190,170,255,1)'
  }, [hoverNode, isHiLink])

  const linkWidth = useCallback((l: FGLink) => {
    if (hoverNode && isHiLink(l.edge_id)) return l.edge_type === 'spine_sequence' ? 1.6 : 1.2
    return l.edge_type === 'spine_sequence' ? 1.0 : 0.7
  }, [hoverNode, isHiLink])

  // 每个节点：球体上方挂一个常驻文字标签
  const nodeThreeObject = useCallback((n: FGNode) => {
    let SpriteText: any
    try { SpriteText = require('three-spritetext').default } catch { return undefined }
    const sprite = new SpriteText(n.title)
    sprite.color = hoverNode ? (isHiNode(n.id) ? '#e8ecf6' : '#3a4158') : '#c4ccdf'
    sprite.textHeight = 4
    sprite.fontFace = 'sans-serif'
    sprite.position.y = -(2 + (degree[n.id] || 0) * 1.5) - 5
    return sprite
  }, [hoverNode, isHiNode, degree])

  const onNodeDrag = useCallback(() => { fgRef.current?.d3ReheatSimulation?.() }, [])

  useEffect(() => {
    const t = setTimeout(() => fgRef.current?.cameraPosition?.({ z: 320 }, undefined, 1500), 300)
    return () => clearTimeout(t)
  }, [])

  const P = { position: 'absolute' as const, top: 72, right: 20, width: 320, maxHeight: 'calc(100vh - 160px)', overflowY: 'auto' as const, zIndex: 10, background: 'rgba(10,14,26,0.78)', border: '1px solid rgba(120,140,200,0.18)', borderRadius: 16, padding: 20, backdropFilter: 'blur(16px)' }

  return (
    <>
      <div style={{ width: '100vw', height: '100vh' }}>
        <ForceGraph3D ref={fgRef} graphData={fgData}
          backgroundColor="#03050c"
          showNavInfo={false}
          nodeColor={nodeColor as any}
          nodeOpacity={0.95}
          nodeResolution={16}
          nodeVal={(n: any) => 2 + (degree[n.id] || 0) * 1.5}
          nodeThreeObject={nodeThreeObject as any}
          nodeThreeObjectExtend={true}
          linkColor={linkColor as any}
          linkWidth={linkWidth as any}
          linkOpacity={0.9}
          linkDirectionalParticles={(l: any) => hoverNode && isHiLink(l.edge_id) ? 3 : 0}
          linkDirectionalParticleWidth={1.6}
          linkDirectionalParticleSpeed={0.006}
          onNodeHover={(n: any) => setHoverNode(n ? n.id : null)}
          onNodeClick={(n: any) => setSelected({ kind: 'node', data: n })}
          onLinkClick={(l: any) => setSelected({ kind: 'edge', data: l, tempWeight: l.weight })}
          onNodeDrag={onNodeDrag}
          enableNodeDrag={true}
          warmupTicks={60} cooldownTicks={200} />
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
