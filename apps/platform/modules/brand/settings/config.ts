// Site Settings configuration — pure data, NOT a server action file
// Kept separate from actions.ts to avoid "use server" export restriction

export const SETTING_SECTIONS = {
  brand: {
    label: "品牌基础信息",
    icon: "🏷️",
    keys: [
      { key: "site_name", label: "品牌名称", type: "text" },
      { key: "site_slogan", label: "品牌 Slogan", type: "text" },
      { key: "site_description", label: "品牌简介", type: "textarea" },
      { key: "brand_story", label: "品牌故事", type: "textarea" },
      { key: "contact_email", label: "联系邮箱", type: "email" },
      { key: "contact_phone", label: "联系电话", type: "tel" },
      { key: "contact_address", label: "联系地址", type: "text" },
    ]
  },
  social: {
    label: "社交媒体",
    icon: "📱",
    keys: [
      { key: "social_wechat", label: "微信", type: "text" },
      { key: "social_weibo", label: "微博", type: "text" },
      { key: "social_xiaohongshu", label: "小红书", type: "text" },
      { key: "social_instagram", label: "Instagram", type: "text" },
      { key: "social_douyin", label: "抖音", type: "text" },
      { key: "social_weixin_mp", label: "公众号", type: "text" },
    ]
  },
  footer: {
    label: "Footer 设置",
    icon: "📋",
    keys: [
      { key: "footer_text", label: "Footer 文案", type: "textarea" },
      { key: "copyright_text", label: "版权信息", type: "text" },
      { key: "icp_beian", label: "备案信息", type: "text" },
      { key: "legal_notice", label: "法律声明", type: "textarea" },
    ]
  },
  legal: {
    label: "法务信息",
    icon: "⚖️",
    keys: [
      { key: "legal_privacy", label: "隐私政策", type: "textarea" },
      { key: "legal_terms", label: "服务条款", type: "textarea" },
      { key: "legal_refund", label: "退款政策", type: "textarea" },
    ]
  }
};

/**
 * Brand Charter Defaults — 首次进入自动填入，已有值不覆盖。
 * 依据《允物品牌宪章》编写。
 */
export const BRAND_DEFAULTS: Record<string, string> = {
  site_name: "允物 ORIGIN",
  site_slogan: "以物载道，以佩修心",
  site_description: "允物 ORIGIN 是一个以东方哲思为核心的饰物品牌，通过天然材质、手工编织与能量叙事，构建人与物之间的精神连接。品牌强调「物有灵，佩有意」，让饰物不仅是装饰，更成为日常修行与自我表达的载体。",
  brand_story: "允物起源于对东方文化、自然材质与日常修行的长期探索。我们相信，每一件物品都承载着时间、情绪与能量。通过珠串、器物、皮具与品牌叙事，允物试图建立一种新的佩戴方式：不追逐快消，不制造噪音，而是回到人与物最本真的连接。",
  contact_email: "service@yunwuorigin.com",
  contact_phone: "",
  contact_address: "中国 · 上海（品牌工作室）",
  social_wechat: "允物 ORIGIN",
  social_weibo: "",
  social_xiaohongshu: "允物 ORIGIN",
  social_instagram: "@yunwuorigin",
  social_douyin: "允物 ORIGIN",
  social_weixin_mp: "允物 ORIGIN",
  footer_text: "© 2026 允物 ORIGIN. All rights reserved.",
  copyright_text: "© 2026 允物 ORIGIN",
  icp_beian: "",
  legal_notice: "所有内容、图像与品牌资产归允物 ORIGIN 所有，未经授权不得转载或商用。",
  legal_privacy: "本网站遵循用户隐私保护原则，所有信息仅用于订单与服务沟通。",
  legal_terms: "",
  legal_refund: "",
};
