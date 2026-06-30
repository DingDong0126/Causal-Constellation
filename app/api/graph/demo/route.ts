import { NextResponse } from 'next/server'
import { demoGraph } from '@/lib/demoData'
export async function GET() { return NextResponse.json(demoGraph) }
