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
      { key: "social_pinterest", label: "Pinterest", type: "text" },
    ]
  },
  footer: {
    label: "Footer 设置",
    icon: "📋",
    keys: [
      { key: "footer_text", label: "Footer 文案", type: "textarea" },
      { key: "copyright_text", label: "版权信息", type: "text" },
      { key: "icp_beian", label: "备案信息", type: "text" },
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
