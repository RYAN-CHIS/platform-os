import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, wechat, email, message } = body

    if (!name || !message) {
      return NextResponse.json(
        { error: '姓名和留言为必填项' },
        { status: 400 }
      )
    }

    const lead = await prisma.contactLead.create({
      data: {
        name,
        we_chat: wechat || null,
        email: email || null,
        message: message || null,
      },
    })

    return NextResponse.json({ success: true, id: lead.id })
  } catch (err) {
    console.error('Contact API error:', err)
    return NextResponse.json(
      { error: '提交失败，请稍后重试' },
      { status: 500 }
    )
  }
}
