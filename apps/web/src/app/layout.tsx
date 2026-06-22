import '@/styles/globals.css';
import { Providers } from "@/components/providers";

// ── SEO Metadata ──
export const metadata = {
  title: '允物｜东方器物品牌',
  description:
    '允物是一家东方器物品牌。以珠串、香器、印章、瓷器与诸般器物为媒介，重新建立人与物之间真实、克制且有温度的关系。',
  openGraph: {
    title: '允物｜东方器物品牌',
    description: '以东方文化为根，以器物回应当代人的精神生活。让物归物，让心归心。',
    type: 'website' as const,
    locale: 'zh_CN',
  },
  keywords: ['允物', '东方器物', '手串', '篆刻', '沉香', '水晶', '东方美学'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
