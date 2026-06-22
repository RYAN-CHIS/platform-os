import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

// GET /api/site-settings — 获取站点配置
export async function GET() {
  try {
    const filePath = join(process.cwd(), 'src/data/site-settings.json');
    const data = await readFile(filePath, 'utf-8');
    const settings = JSON.parse(data);
    return NextResponse.json(settings, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch {
    return NextResponse.json(
      { error: '站点配置加载失败' },
      { status: 500 }
    );
  }
}
