import Link from 'next/link';
import '@/styles/globals.css';
import { getSiteSettingValue } from '@/lib/actions/admin-actions';

// ── SEO Metadata ──
export const metadata = {
  title: '允物 ORIGIN｜东方器物品牌',
  description:
    '允物是一家东方器物品牌。以珠串、香器、印章、瓷器与诸般器物为媒介，重新建立人与物之间真实、克制且有温度的关系。',
  openGraph: {
    title: '允物 ORIGIN｜东方器物品牌',
    description: '以东方文化为根，以器物回应当代人的精神生活。让物归物，让心归心。',
    type: 'website' as const,
    locale: 'zh_CN',
  },
};

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="min-h-screen">{children}</main>
      <Footer />
    </>
  );
}

// ── 导航栏 ──
function Navbar() {
  const links = [
    { href: '/', label: '首页' },
    { href: '/series', label: '七序' },
    { href: '/objects', label: '器物' },
    { href: '/journal', label: '品牌志' },
    { href: '/about', label: '关于允物' },
    { href: '/contact', label: '同行者' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-yun-white/95 backdrop-blur-sm border-b border-yun">
      <div className="container-brand flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-3 group">
          <img src="/logo-icon.png" alt="允物" className="h-8 w-auto opacity-90 group-hover:opacity-100 transition-opacity" />
          <span className="text-2xl font-light tracking-[0.25em] text-yun-text">允物</span>
        </Link>

        <div className="hidden md:flex items-center gap-10">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm text-yun-text/70 hover:text-yun-text tracking-wider transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* 移动端汉堡菜单占位 */}
        <div className="md:hidden flex items-center">
          <button className="text-yun-text/70 hover:text-yun-text transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>
        </div>
      </div>
    </nav>
  );
}

// ── 页脚 ──
async function Footer() {
  const [wechat, email, xiaohongshu, copyright, icp] = await Promise.all([
    getSiteSettingValue('wechat'),
    getSiteSettingValue('email'),
    getSiteSettingValue('xiaohongshu'),
    getSiteSettingValue('copyright'),
    getSiteSettingValue('icp'),
  ]);
  return (
    <footer className="bg-yun-dark text-yun-grey">
      <div className="container-brand py-16">
        <div className="grid md:grid-cols-3 gap-10">
          {/* 品牌信息 */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img src="/logo-icon.png" alt="允物" className="h-8 w-auto opacity-70" />
              <span className="text-2xl font-light tracking-[0.25em] text-yun-white/80">允物</span>
            </div>
            <p className="text-sm leading-relaxed opacity-70 mt-4">
              以东方文化为根，<br />
              以器物回应当代人的精神生活。<br />
              让物归物，让心归心。
            </p>
          </div>

          {/* 快速链接 */}
          <div>
            <h4 className="text-yun-white text-sm tracking-widest mb-4">探索</h4>
            <div className="grid grid-cols-2 gap-2 text-sm opacity-70">
              <Link href="/series" className="hover:text-yun-white transition-colors">七序体系</Link>
              <Link href="/objects" className="hover:text-yun-white transition-colors">东方器物</Link>
              <Link href="/journal" className="hover:text-yun-white transition-colors">品牌志</Link>
              <Link href="/materials" className="hover:text-yun-white transition-colors">材料研究</Link>
              <Link href="/about" className="hover:text-yun-white transition-colors">关于允物</Link>
              <Link href="/contact" className="hover:text-yun-white transition-colors">同行者社群</Link>
            </div>
          </div>

          {/* 联系方式 */}
          <div>
            <h4 className="text-yun-white text-sm tracking-widest mb-4">联系</h4>
            <div className="text-sm opacity-70 space-y-1">
              <p>微信公众号：{wechat || '允物 Yunwu'}</p>
              <p>小红书：允物</p>
              <p>邮箱：{email || 'hello@yunwuorigin.com'}</p>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-yun-grey/20 flex flex-col md:flex-row justify-between items-center gap-4 text-xs opacity-50">
          <p>{copyright || '© 2026 允物 Yunwu Origin. All rights reserved.'}</p>
          <p>{icp || '备案号：办理中'}</p>
        </div>
      </div>
    </footer>
  );
}
