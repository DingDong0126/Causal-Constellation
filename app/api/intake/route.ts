import { NextResponse } from 'next/server'
import { demoGraph } from '@/lib/demoData'

// 用户讲述人生故事的入口接口
// 现在留白：先返回示例星图，保证「欢迎页 → 聆听 → 星图」整条流程跑通
// 将来在下方 TODO 处接入 LLM（OpenAI 等），从 text 抽取人生节点、构建因果图
export async function POST(req: Request) {
  const { text } = await req.json().catch(() => ({ text: '' }))

  // ===== TODO: 在这里接入 OpenAI =====
  // const nodes = await extractNodesWithLLM(text)
  // const edges = await inferCausalEdges(nodes)
  // return NextResponse.json({ nodes, edges })
  // ===================================

  // 模拟「AI 正在聆听并思考」的节奏感（之后接真模型可删）
  await new Promise((r) => setTimeout(r, 1400))

  console.log('[intake] 收到用户故事，长度：', (text || '').length)
  return NextResponse.json(demoGraph)
}
