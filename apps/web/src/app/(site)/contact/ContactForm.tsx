'use client'

import { FormEvent, useState } from 'react'

export default function ContactForm() {
  const [pending, setPending] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)

    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get('name') as string,
      wechat: (formData.get('wechat') as string) || null,
      email: (formData.get('email') as string) || null,
      message: (formData.get('message') as string) || null,
    }

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        setSuccess(true)
      }
    } catch (err) {
      console.error('Contact submission failed:', err)
    } finally {
      setPending(false)
    }
  }

  if (success) {
    return (
      <div className="text-center py-12">
        <p className="text-yun-accent text-lg mb-4">✓</p>
        <p className="text-yun-text">感谢你的留言，我们会尽快回复。</p>
        <button
          onClick={() => setSuccess(false)}
          className="mt-8 text-sm text-yun-subtext hover:text-yun-accent transition-colors"
        >
          继续留言 →
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="name" className="block text-xs text-yun-subtext tracking-wider mb-2">
          姓名 <span className="text-yun-accent">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          className="w-full border border-yun-line bg-transparent px-4 py-3 text-yun-text text-sm focus:border-yun-accent outline-none transition-colors"
        />
      </div>

      <div>
        <label htmlFor="wechat" className="block text-xs text-yun-subtext tracking-wider mb-2">
          微信
        </label>
        <input
          id="wechat"
          name="wechat"
          type="text"
          className="w-full border border-yun-line bg-transparent px-4 py-3 text-yun-text text-sm focus:border-yun-accent outline-none transition-colors"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-xs text-yun-subtext tracking-wider mb-2">
          邮箱
        </label>
        <input
          id="email"
          name="email"
          type="email"
          className="w-full border border-yun-line bg-transparent px-4 py-3 text-yun-text text-sm focus:border-yun-accent outline-none transition-colors"
        />
      </div>

      <div>
        <label htmlFor="message" className="block text-xs text-yun-subtext tracking-wider mb-2">
          留言 <span className="text-yun-accent">*</span>
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          className="w-full border border-yun-line bg-transparent px-4 py-3 text-yun-text text-sm focus:border-yun-accent outline-none transition-colors resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full md:w-auto px-12 py-4 bg-yun-accent text-yun-white text-sm tracking-wider hover:bg-yun-accent/90 disabled:opacity-40 transition-colors"
      >
        {pending ? '提交中…' : '发送留言'}
      </button>
    </form>
  )
}
