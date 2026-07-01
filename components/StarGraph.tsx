'use client'
import { useRef, useState, useCallback, useMemo, useEffect } from 'react'
import dynamic from 'next/dynamic'
const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), { ssr: false })
import type React from 'react'
import type { CausalGraph, GraphNode, GraphEdge, Category, Valence, EdgeType } from '@/lib/types'

const VALENCE_COLOR: Record<string, string> = {
  positive: '#ff9eb5', complex: '#a78bfa', heavy: '#9d7cf0', neutral: '#8b95b3',
}
const SPINE_COLOR = '#aab4d4'
const GRAY = '#7c87a8'
const DIM = '#2a3147'
const PICK = '#ffd77c' // 连线模式选中的星

const CAT_OPTIONS: { v: Category; label: string }[] = [
  { v: 'education', label: '教育' }, { v: 'career', label: '职业' }, { v: 'relationship', label: '关系' },
  { v: 'location', label: '居住' }, { v: 'health', label: '健康' }, { v: 'identity', label: '自我认知' },
  { v: 'financial', label: '经济' }, { v: 'creative', label: '创造' }, { v: 'external', label: '外部冲击' },
]
const VAL_OPTIONS: { v: Valence; label: string }[] = [
  { v: 'positive', label: '正向' }, { v: 'complex', label: '复杂' }, { v: 'heavy', label: '沉重' }, { v: 'neutral', label: '中性' },
]

interface FGNode extends GraphNode { id: string }
interface FGLink extends Omit<GraphEdge, 'source'> { source: string | FGNode; target: string | FGNode }

export default function StarGraph({ graph, onEdgeWeightChange, onEdgeDelete, onEdgeConfirm, onNodeAdd, onNodeDelete, onEdgeAdd, whatIfDeltas }: {
  graph: CausalGraph
  onEdgeWeightChange: (edgeId: string, newWeight: number) => void
  onEdgeDelete: (edgeId: string) => void
  onEdgeConfirm: (edgeId: string) => void
  onNodeAdd: (node: GraphNode) => void
  onNodeDelete: (nodeId: string) => void
  onEdgeAdd: (edge: GraphEdge) => void
  whatIfDeltas: Record<string, number> | null
}) {
  const fgRef = useRef<any>(null)
  const [hoverNode, setHoverNode] = useState<string | null>(null)
  const [selected, setSelected] = useState<
    | { kind: 'node'; data: GraphNode }
    | { kind: 'edge'; data: GraphEdge; tempWeight: number }
    | null
  >(null)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState<{ title: string; category: Category; valence: Valence }>({ title: '', category: 'identity', valence: 'neutral' })

  // —— 牵引引力：连线模式 ——
  const [linking, setLinking] = useState(false)
  const [linkSource, setLinkSource] = useState<string | null>(null)
  const [pendingEdge, setPendingEdge] = useState<{ from: GraphNode; to: GraphNode; type: EdgeType; weight: number; rationale: string } | null>(null)

  const nodeMap = useMemo(() => Object.fromEntries(graph.nodes.map((n) => [n.node_id, n])), [graph])

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
    if (linking && linkSource === n.id) return PICK
    if (whatIfDeltas?.[n.id] !== undefined && Math.abs(whatIfDeltas[n.id]) > 0.01)
      return whatIfDeltas[n.id] > 0 ? '#7cffb5' : '#ff7c7c'
    if (linking) return n.type === 'spine' ? SPINE_COLOR : (VALENCE_COLOR[n.valence] || GRAY) // 连线模式全部点亮好辨认
    if (!hoverNode) return GRAY
    if (!isHiNode(n.id)) return DIM
    return n.type === 'spine' ? SPINE_COLOR : (VALENCE_COLOR[n.valence] || GRAY)
  }, [linking, linkSource, hoverNode, isHiNode, whatIfDeltas])

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

  const nodeThreeObject = useCallback((n: FGNode) => {
    let SpriteText: any
    try { SpriteText = require('three-spritetext').default } catch { return undefined }
    const sprite = new SpriteText(n.title)
    sprite.color = linking ? '#e8ecf6' : (hoverNode ? (isHiNode(n.id) ? '#e8ecf6' : '#3a4158') : '#c4ccdf')
    sprite.textHeight = 4
    sprite.fontFace = 'sans-serif'
    sprite.position.y = -(2 + (degree[n.id] || 0) * 1.5) - 5
    return sprite
  }, [linking, hoverNode, isHiNode, degree])

  const onNodeDrag = useCallback(() => { fgRef.current?.d3ReheatSimulation?.() }, [])

  useEffect(() => {
    const t = setTimeout(() => fgRef.current?.cameraPosition?.({ z: 320 }, undefined, 1500), 300)
    return () => clearTimeout(t)
  }, [])

  // 星辰被点击：连线模式下走选点逻辑，否则打开详情
  const handleNodeClick = useCallback((n: FGNode) => {
    if (!linking) { setSelected({ kind: 'node', data: n }); return }
    if (!linkSource) { setLinkSource(n.id); return }
    if (linkSource === n.id) { setLinkSource(null); return } // 点自己=取消
    const from = nodeMap[linkSource], to = nodeMap[n.id]
    if (from && to) setPendingEdge({ from, to, type: 'causal', weight: 0.5, rationale: '' })
    setLinkSource(null)
  }, [linking, linkSource, nodeMap])

  const startLinking = () => { setSelected(null); setAdding(false); setLinking(true); setLinkSource(null) }
  const cancelLinking = () => { setLinking(false); setLinkSource(null); setPendingEdge(null) }

  const submitEdge = () => {
    if (!pendingEdge) return
    const edge: GraphEdge = {
      edge_id: `e_${Date.now()}`,
      source_node_id: pendingEdge.from.node_id,
      target_node_id: pendingEdge.to.node_id,
      edge_type: pendingEdge.type,
      weight: pendingEdge.weight,
      direction: 'forward',
      confidence: 1,
      source: 'user_created',
      rationale: pendingEdge.rationale.trim() || null,
    }
    onEdgeAdd(edge)
    setPendingEdge(null)
    setLinking(false)
  }

  const submitAdd = () => {
    const title = form.title.trim()
    if (!title) return
    const node: GraphNode = {
      node_id: `n_${Date.now()}`, type: 'branch', category: form.category,
      date: null, entity: null, title, valence: form.valence,
      confidence: 1, source: 'user_stated', raw_quote: null, parent_spine_id: null,
    }
    onNodeAdd(node)
    setForm({ title: '', category: 'identity', valence: 'neutral' })
    setAdding(false)
  }

  const P = { position: 'absolute' as const, top: 72, right: 20, width: 320, maxHeight: 'calc(100vh - 160px)', overflowY: 'auto' as const, zIndex: 10, background: 'rgba(10,14,26,0.86)', border: '1px solid rgba(120,140,200,0.18)', borderRadius: 16, padding: 20, backdropFilter: 'blur(16px)' }
  const field = { width: '100%', marginTop: 6, padding: '9px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(120,140,200,0.25)', borderRadius: 10, color: '#e8ecf6', fontSize: 13, fontFamily: 'inherit', outline: 'none' } as const

  return (
    <>
      <div style={{ width: '100vw', height: '100vh' }}>
        <ForceGraph3D ref={fgRef} graphData={fgData}
          backgroundColor="#03050c" showNavInfo={false}
          nodeColor={nodeColor as any} nodeOpacity={0.95} nodeResolution={16}
          nodeVal={(n: any) => 2 + (degree[n.id] || 0) * 1.5}
          nodeThreeObject={nodeThreeObject as any} nodeThreeObjectExtend={true}
          linkColor={linkColor as any} linkWidth={linkWidth as any} linkOpacity={0.9}
          linkDirectionalParticles={(l: any) => hoverNode && isHiLink(l.edge_id) ? 3 : 0}
          linkDirectionalParticleWidth={1.6} linkDirectionalParticleSpeed={0.006}
          onNodeHover={(n: any) => setHoverNode(n ? n.id : null)}
          onNodeClick={handleNodeClick as any}
          onLinkClick={(l: any) => { if (!linking) setSelected({ kind: 'edge', data: l, tempWeight: l.weight }) }}
          onNodeDrag={onNodeDrag} enableNodeDrag={true}
          warmupTicks={60} cooldownTicks={200} />
      </div>

      {/* 左下角操作区 */}
      <div style={{ position: 'absolute', left: 24, bottom: 24, zIndex: 10, display: 'flex', gap: 10 }}>
        <button className="btn" style={{ padding: '10px 18px', borderRadius: 24, background: 'rgba(124,156,255,0.16)', borderColor: 'rgba(124,156,255,0.4)', color: '#bcd0ff', fontSize: 13, letterSpacing: '1px', backdropFilter: 'blur(12px)' }}
          onClick={() => { setSelected(null); setLinking(false); setAdding(true) }}>✦ 点亮一颗星</button>
        <button className="btn" style={{ padding: '10px 18px', borderRadius: 24, background: linking ? 'rgba(255,215,124,0.18)' : 'rgba(167,139,250,0.16)', borderColor: linking ? 'rgba(255,215,124,0.5)' : 'rgba(167,139,250,0.4)', color: linking ? '#ffe4a0' : '#c9b8ff', fontSize: 13, letterSpacing: '1px', backdropFilter: 'blur(12px)' }}
          onClick={linking ? cancelLinking : startLinking}>{linking ? '✕ 退出牵引' : '⤳ 牵引一道引力'}</button>
      </div>

      {/* 连线模式提示条 */}
      {linking && !pendingEdge && (
        <div style={{ position: 'absolute', top: 108, left: '50%', transform: 'translateX(-50%)', zIndex: 11, fontSize: 12.5, color: '#ffe4a0', letterSpacing: '1px', background: 'rgba(255,215,124,0.1)', padding: '8px 18px', borderRadius: 16, border: '1px solid rgba(255,215,124,0.3)' }}>
          {linkSource ? '再点一颗星，作为这道引力的「终点」（因）→（果）' : '点一颗星，作为这道引力的「起点」（因）'}
        </div>
      )}

      {/* 点亮一颗星 表单 */}
      {adding && (
        <div style={P}>
          <h3 style={{ fontSize: 15, marginBottom: 4 }}>✦ 点亮一颗星</h3>
          <p style={{ fontSize: 11, color: '#8b95b3', marginBottom: 14 }}>补上一段属于你、AI 尚未看见的人生片段</p>
          <label style={{ fontSize: 11, color: '#8b95b3' }}>这颗星是什么
            <input autoFocus value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="例如：那年夏天的离别" style={field}
              onKeyDown={(e) => { if (e.key === 'Enter') submitAdd() }} />
          </label>
          <label style={{ fontSize: 11, color: '#8b95b3', display: 'block', marginTop: 12 }}>属于哪片星域
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Category })} style={field}>
              {CAT_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>
          <label style={{ fontSize: 11, color: '#8b95b3', display: 'block', marginTop: 12 }}>它的情绪光色
            <select value={form.valence} onChange={(e) => setForm({ ...form, valence: e.target.value as Valence })} style={field}>
              {VAL_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button className="btn primary" style={{ flex: 1 }} disabled={!form.title.trim()} onClick={submitAdd}>点亮</button>
            <button className="btn" onClick={() => setAdding(false)}>取消</button>
          </div>
        </div>
      )}

      {/* 牵引引力 确认表单 */}
      {pendingEdge && (
        <div style={P}>
          <h3 style={{ fontSize: 15, marginBottom: 4 }}>⤳ 牵引一道引力</h3>
          <p style={{ fontSize: 12, color: '#c4ccdf', margin: '10px 0', lineHeight: 1.7 }}>
            <span style={{ color: '#ffd77c' }}>{pendingEdge.from.title}</span>
            <span style={{ color: '#8b95b3' }}>　牵引着　→　</span>
            <span style={{ color: '#a78bfa' }}>{pendingEdge.to.title}</span>
          </p>
          <label style={{ fontSize: 11, color: '#8b95b3', display: 'block', marginTop: 12 }}>这是怎样的一道引力
            <select value={pendingEdge.type} onChange={(e) => setPendingEdge({ ...pendingEdge, type: e.target.value as EdgeType })} style={field}>
              <option value="causal">因果 · 前者促成了后者</option>
              <option value="attribution">归因 · 后者源于前者</option>
            </select>
          </label>
          <label style={{ fontSize: 11, color: '#8b95b3', display: 'block', marginTop: 14 }}>引力有多深
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, color: '#8b95b3', marginTop: 8 }}>
              <span>微弱</span>
              <input type="range" min={0} max={1} step={0.05} value={pendingEdge.weight}
                style={{ flex: 1, accentColor: '#a78bfa', cursor: 'pointer' }}
                onChange={(e) => setPendingEdge({ ...pendingEdge, weight: +e.target.value })} />
              <span>深刻</span>
            </div>
          </label>
          <label style={{ fontSize: 11, color: '#8b95b3', display: 'block', marginTop: 14 }}>想说一句它为何相连（可留白）
            <input value={pendingEdge.rationale} onChange={(e) => setPendingEdge({ ...pendingEdge, rationale: e.target.value })}
              placeholder="例如：正是那次离别，让我学会独自面对" style={field} />
          </label>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button className="btn primary" style={{ flex: 1 }} onClick={submitEdge}>牵引成线</button>
            <button className="btn" onClick={() => { setPendingEdge(null); }}>取消</button>
          </div>
        </div>
      )}

      {selected && !linking && (
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
              {selected.data.type === 'spine' ? (
                <p style={{ fontSize: 11, color: '#5a6480', marginTop: 12 }}>时间主干上的星辰 · 不可隐去</p>
              ) : (
                <button className="btn danger" style={{ width: '100%', marginTop: 12 }}
                  onClick={() => { onNodeDelete(selected.data.node_id); setSelected(null) }}>让这颗星隐去</button>
              )}
            </>
          )}
          {selected.kind === 'edge' && (
            <>
              <h3 style={{ fontSize: 15, marginBottom: 4 }}>修正星轨</h3>
              <p style={{ fontSize: 11, color: '#8b95b3', marginBottom: 14 }}>
                {etLabel(selected.data.edge_type)} · {selected.data.source === 'ai_suggested' ? 'AI 猜测' : selected.data.source === 'user_created' ? '你牵引' : '你已认下'}
              </p>
              <div style={{ padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(120,140,200,0.18)' }}>
                {selected.data.rationale && <p style={{ fontSize: 11, color: '#8b95b3', lineHeight: 1.5, marginBottom: 10 }}>💭 {selected.data.rationale}</p>}
                {(selected.data.edge_type === 'attribution' || selected.data.edge_type === 'causal') ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, color: '#8b95b3' }}>
                      <span>微弱</span>
                      <input type="range" min={0} max={1} step={0.05} value={selected.tempWeight}
                        style={{ flex: 1, accentColor: '#7c9cff', cursor: 'pointer' }}
                        onChange={(e) => setSelected((s) => s?.kind === 'edge' ? { ...s, tempWeight: +e.target.value } : s)}
                        onMouseUp={(e) => onEdgeWeightChange(selected.data.edge_id, +(e.target as HTMLInputElement).value)} />
                      <span>深刻</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <button className="btn primary" onClick={() => onEdgeConfirm(selected.data.edge_id)}>认下这道引力</button>
                      <button className="btn danger" onClick={() => onEdgeDelete(selected.data.edge_id)}>斩断这道引力</button>
                    </div>
                  </>
                ) : <p style={{ fontSize: 11, color: '#8b95b3' }}>主干时间线 · 不可修正</p>}
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
