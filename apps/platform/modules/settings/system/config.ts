/**
 * System Config Labels & Templates — pure data, NOT a server action file
 */

export const CONFIG_LABEL_MAP: Record<string, string> = {
  defaultCurrency: "默认货币",
  defaultLanguage: "默认语言",
  maintenanceMode: "维护模式",
  siteName: "站点名称",
  timezone: "时区",
  uploadLimit: "上传限制",
  siteDescription: "站点描述",
  siteLogo: "站点 Logo",
  siteVersion: "系统版本",
  maxImageSize: "图片上传限制",
  maxVideoSize: "视频上传限制",
  allowedFileTypes: "允许上传类型",
  smtpHost: "SMTP 主机",
  smtpPort: "SMTP 端口",
  smtpUser: "SMTP 用户",
  smtpPassword: "SMTP 密码",
  defaultSeoTitle: "默认 SEO 标题",
  defaultSeoDescription: "默认 SEO 描述",
  logRetentionDays: "日志保留天数",
  sessionExpireHours: "会话过期时间",
};

export const CONFIG_TEMPLATES = [
  { key: "siteDescription", label: "站点描述", type: "string", description: "品牌站点描述信息" },
  { key: "siteLogo", label: "站点 Logo", type: "string", description: "Logo 图片 URL" },
  { key: "siteVersion", label: "系统版本", type: "string", description: "当前系统版本号" },
  { key: "maxImageSize", label: "图片上传限制", type: "number", description: "最大图片上传尺寸（MB）" },
  { key: "maxVideoSize", label: "视频上传限制", type: "number", description: "最大视频上传尺寸（MB）" },
  { key: "allowedFileTypes", label: "允许上传类型", type: "string", description: "逗号分隔的文件类型" },
  { key: "smtpHost", label: "SMTP 主机", type: "string", description: "邮件服务器地址" },
  { key: "smtpPort", label: "SMTP 端口", type: "number", description: "邮件服务器端口" },
  { key: "smtpUser", label: "SMTP 用户", type: "string", description: "邮件服务器用户名" },
  { key: "smtpPassword", label: "SMTP 密码", type: "string", description: "邮件服务器密码" },
  { key: "defaultSeoTitle", label: "默认 SEO 标题", type: "string", description: "全站默认 SEO 标题" },
  { key: "defaultSeoDescription", label: "默认 SEO 描述", type: "string", description: "全站默认 SEO 描述" },
  { key: "logRetentionDays", label: "日志保留天数", type: "number", description: "系统日志保留天数" },
  { key: "sessionExpireHours", label: "会话过期时间", type: "number", description: "用户会话过期时间（小时）" },
];

export function getConfigLabel(key: string): string {
  return CONFIG_LABEL_MAP[key] || key;
}
