import { NextRequest, NextResponse } from 'next/server'
import { runWhatIf } from '@/lib/whatIf'
import type { CausalGraph } from '@/lib/types'
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { graph, intervention_edge_id, new_weight } = body as { graph: CausalGraph; intervention_edge_id: string; new_weight: number }
  return NextResponse.json(runWhatIf(graph, intervention_edge_id, new_weight))
}
