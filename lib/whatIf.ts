import type { CausalGraph } from './types'
function topologicalOrder(nodeIds: string[], edges: [string, string][]): string[] {
  const indeg = new Map<string, number>(nodeIds.map((n) => [n, 0]))
  const adj = new Map<string, string[]>(nodeIds.map((n) => [n, []]))
  for (const [s, t] of edges) { if (indeg.has(s) && indeg.has(t)) { adj.get(s)!.push(t); indeg.set(t, (indeg.get(t) || 0) + 1) } }
  const queue = nodeIds.filter((n) => (indeg.get(n) || 0) === 0)
  const order: string[] = []
  while (queue.length > 0) { const n = queue.shift()!; order.push(n); for (const m of adj.get(n) || []) { indeg.set(m, (indeg.get(m) || 0) - 1); if ((indeg.get(m) || 0) === 0) queue.push(m) } }
  if (order.length !== nodeIds.length) return [...nodeIds]
  return order
}
function propagate(graph: CausalGraph, weightOverride?: Record<string, number>): Record<string, number> {
  const baseState = new Map<string, number>(graph.nodes.map((n) => [n.node_id, n.confidence]))
  const inEdges = new Map<string, [string, number][]>(graph.nodes.map((n) => [n.node_id, []]))
  const edgePairs: [string, string][] = []
  for (const e of graph.edges) { const w = weightOverride?.[e.edge_id] ?? e.weight; inEdges.get(e.target_node_id)?.push([e.source_node_id, w]); edgePairs.push([e.source_node_id, e.target_node_id]) }
  const order = topologicalOrder(graph.nodes.map((n) => n.node_id), edgePairs)
  const state: Record<string, number> = {}
  for (const nid of order) { const incoming = inEdges.get(nid) || []; if (incoming.length === 0) { state[nid] = baseState.get(nid) ?? 0.5 } else { const totalW = incoming.reduce((s, [, w]) => s + w, 0); if (totalW === 0) { state[nid] = baseState.get(nid) ?? 0.5 } else { const agg = incoming.reduce((s, [src, w]) => s + (state[src] ?? baseState.get(src) ?? 0.5) * w, 0) / totalW; state[nid] = Math.round((0.7 * agg + 0.3 * (baseState.get(nid) ?? 0.5)) * 10000) / 10000 } } }
  return state
}
export function runWhatIf(graph: CausalGraph, interventionEdgeId: string, newWeight: number) {
  const baseline = propagate(graph)
  const counterfactual = propagate(graph, { [interventionEdgeId]: newWeight })
  const deltas: Record<string, number> = {}
  for (const nid of Object.keys(baseline)) { deltas[nid] = Math.round((counterfactual[nid] - baseline[nid]) * 10000) / 10000 }
  return { baseline, counterfactual, deltas }
}
