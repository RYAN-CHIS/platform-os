'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SectionWrapper from '@/components/ui/SectionWrapper';

interface CartItem {
  slug: string;
  name: string;
  price: number;
  quantity: number;
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<CheckoutLoading />}>
      <CheckoutContent />
    </Suspense>
  );
}

function CheckoutLoading() {
  return (
    <SectionWrapper className="min-h-[60vh] flex items-center justify-center">
      <p className="text-sm text-[var(--yun-gray)] tracking-wider">加载中...</p>
    </SectionWrapper>
  );
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const success = searchParams.get('success');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', address: '', remark: '' });

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('yunwu_cart') || '[]');
    setCart(saved);
  }, []);

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0 || !form.name || !form.phone || !form.address) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart,
          customerName: form.name,
          phone: form.phone,
          address: form.address,
          remark: form.remark,
        }),
      });

      if (res.ok) {
        localStorage.removeItem('yunwu_cart');
        router.push('/checkout?success=1');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // 成功页面
  if (success === '1') {
    return (
      <main className="min-h-screen bg-[var(--yun-paper)]">
        <SectionWrapper className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center max-w-md mx-auto fade-in">
            <div className="text-6xl mb-8">☁️</div>
            <h1 className="text-2xl font-light tracking-[0.12em] mb-4 text-[var(--yun-ink)]">获取确认</h1>
            <div className="divider mb-8" />
            <p className="text-sm text-[var(--yun-gray)] leading-loose mb-4">
              您的获取请求已提交。
              我们将尽快与您联系确认订单详情。
            </p>
            <p className="text-xs text-[var(--yun-gray)]/50 tracking-wider mb-10">
              如有疑问请通过公众号「允物 Yunwu」联系我们
            </p>
            <a
              href="/"
              className="inline-block px-8 py-3 border border-[var(--yun-border)] rounded-[var(--yun-radius-pill)] text-sm tracking-wider text-[var(--yun-ink)] hover:bg-[var(--yun-ink)] hover:text-[var(--yun-paper)] hover:border-[var(--yun-ink)] transition-all duration-300"
            >
              返回首页
            </a>
          </div>
        </SectionWrapper>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--yun-paper)]">
      {/* Hero */}
      <SectionWrapper className="min-h-[30vh] flex items-center justify-center">
        <div className="text-center max-w-4xl mx-auto fade-in">
          <p className="font-display text-6xl md:text-8xl text-[var(--yun-ink)]/5 tracking-widest leading-none mb-8">
            CHECKOUT
          </p>
          <h1 className="font-display text-3xl md:text-4xl text-[var(--yun-ink)] tracking-wide mb-6">
            获取作品
          </h1>
        </div>
      </SectionWrapper>

      {/* 订单表单 */}
      <SectionWrapper>
        <div className="max-w-2xl mx-auto">
          {cart.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-sm text-[var(--yun-gray)] tracking-wider mb-6">购物袋是空的</p>
              <a
                href="/products"
                className="inline-block px-8 py-3 border border-[var(--yun-border)] rounded-[var(--yun-radius-pill)] text-sm tracking-wider text-[var(--yun-ink)] hover:bg-[var(--yun-ink)] hover:text-[var(--yun-paper)] hover:border-[var(--yun-ink)] transition-all duration-300"
              >
                浏览作品
              </a>
            </div>
          ) : (
            <div className="space-y-8">
              {/* 订单摘要 */}
              <div className="border border-[var(--yun-border)] rounded-[var(--yun-radius)] p-6">
                <h2 className="text-sm font-light tracking-wider mb-4 text-[var(--yun-ink)]">订单摘要</h2>
                {cart.map((item, i) => (
                  <div key={i} className="flex justify-between items-center py-3 border-b border-[var(--yun-border)]/20 last:border-0">
                    <div>
                      <p className="text-sm tracking-wider text-[var(--yun-ink)]">{item.name}</p>
                      <p className="text-xs text-[var(--yun-gray)]/50">x{item.quantity}</p>
                    </div>
                    <p className="text-sm text-[var(--yun-gray)]">¥{(item.price * item.quantity).toLocaleString()}</p>
                  </div>
                ))}
                <div className="flex justify-between items-center mt-4 pt-3 border-t border-[var(--yun-border)]">
                  <p className="text-sm tracking-wider text-[var(--yun-ink)]">合计</p>
                  <p className="text-lg font-light tracking-wider text-[var(--yun-ink)]">¥{total.toLocaleString()}</p>
                </div>
              </div>

              {/* 联系信息 */}
              <form onSubmit={handleSubmit} className="border border-[var(--yun-border)] rounded-[var(--yun-radius)] p-6 space-y-5">
                <h2 className="text-sm font-light tracking-wider mb-4 text-[var(--yun-ink)]">联系信息</h2>
                <div>
                  <label className="block text-xs text-[var(--yun-gray)] tracking-wider mb-2">姓名</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-3 border border-[var(--yun-border)] rounded-[var(--yun-radius)] bg-transparent text-sm text-[var(--yun-ink)] focus:outline-none focus:border-[var(--yun-jade)] transition-colors"
                    placeholder="请输入您的姓名"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--yun-gray)] tracking-wider mb-2">电话</label>
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-4 py-3 border border-[var(--yun-border)] rounded-[var(--yun-radius)] bg-transparent text-sm text-[var(--yun-ink)] focus:outline-none focus:border-[var(--yun-jade)] transition-colors"
                    placeholder="请输入您的手机号"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--yun-gray)] tracking-wider mb-2">地址</label>
                  <input
                    type="text"
                    required
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="w-full px-4 py-3 border border-[var(--yun-border)] rounded-[var(--yun-radius)] bg-transparent text-sm text-[var(--yun-ink)] focus:outline-none focus:border-[var(--yun-jade)] transition-colors"
                    placeholder="请输入您的收货地址"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--yun-gray)] tracking-wider mb-2">备注（选填）</label>
                  <textarea
                    value={form.remark}
                    onChange={(e) => setForm({ ...form, remark: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-3 border border-[var(--yun-border)] rounded-[var(--yun-radius)] bg-transparent text-sm text-[var(--yun-ink)] focus:outline-none focus:border-[var(--yun-jade)] transition-colors resize-none"
                    placeholder="如有特殊需求请在此说明"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full px-8 py-3 bg-[var(--yun-ink)] text-[var(--yun-paper)] text-sm tracking-wider rounded-[var(--yun-radius-pill)] hover:bg-[var(--yun-jade)] disabled:opacity-50 transition-all duration-300"
                >
                  {submitting ? '提交中...' : '确认获取'}
                </button>
              </form>
            </div>
          )}
        </div>
      </SectionWrapper>
    </main>
  );
}
