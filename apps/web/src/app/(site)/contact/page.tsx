import ContactForm from './ContactForm'
import { Metadata } from 'next'
import { getSiteSettingValue } from '@/lib/actions/admin-actions'

export const metadata: Metadata = {
  title: '联系允物｜允物品牌',
  description: '如果你愿意，欢迎与我们聊聊器物、生活与本心。',
}

export default async function ContactPage() {
  const [wechat, email, xiaohongshu] = await Promise.all([
    getSiteSettingValue('wechat'),
    getSiteSettingValue('email'),
    getSiteSettingValue('xiaohongshu'),
  ]);

  return (
    <main className="min-h-screen bg-yun-bg">
      {/* Hero */}
      <section className="py-24 md:py-32 px-6 md:px-12">
        <div className="max-w-4xl mx-auto text-center">
          <p className="font-display text-6xl md:text-8xl text-yun-accent/10 tracking-widest leading-none mb-8">
            CONTACT
          </p>
          <h1 className="font-display text-3xl md:text-4xl text-yun-text tracking-wide mb-6">
            联系允物
          </h1>
          <p className="text-lg md:text-xl text-yun-subtext leading-relaxed max-w-2xl mx-auto">
            如果你愿意，欢迎与我们聊聊器物、生活与本心。
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 md:px-12 pb-24 md:pb-32">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16">
          {/* Contact Info */}
          <div className="border border-yun-line p-8 md:p-10">
            <h2 className="font-display text-xl text-yun-text mb-8 tracking-wide">
              联系方式
            </h2>
            <div className="space-y-6">
              {wechat && (
                <div>
                  <p className="text-xs text-yun-subtext tracking-wider mb-1">微信</p>
                  <p className="text-yun-text">{wechat}</p>
                </div>
              )}
              {email && (
                <div>
                  <p className="text-xs text-yun-subtext tracking-wider mb-1">邮箱</p>
                  <a
                    href={`mailto:${email}`}
                    className="text-yun-text hover:text-yun-accent transition-colors"
                  >
                    {email}
                  </a>
                </div>
              )}
              {xiaohongshu && (
                <div>
                  <p className="text-xs text-yun-subtext tracking-wider mb-1">小红书</p>
                  <a
                    href={xiaohongshu}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-yun-text hover:text-yun-accent transition-colors"
                  >
                    允物 Yunwu
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Contact Form */}
          <div className="border border-yun-line p-8 md:p-10">
            <h2 className="font-display text-xl text-yun-text mb-8 tracking-wide">
              与允物同行
            </h2>
            <ContactForm />
          </div>
        </div>
      </div>
    </main>
  )
}
