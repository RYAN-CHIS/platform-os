# 允物 Yunwu Origin — 东方器物品牌独立站

> 让物归物，让心归心。允许万物成为万物。

---

## 技术栈

| 层 | 技术 |
|---|---|
| 框架 | Next.js 15 + TypeScript |
| 样式 | Tailwind CSS |
| 数据库 | SQLite（本地）/ PostgreSQL（生产） |
| ORM | Prisma |
| 部署 | Vercel（推荐） |

---

## 快速启动

```bash
# 1. 安装依赖
npm install

# 2. 初始化数据库 + 播种数据
npm run db:setup

# 3. 启动开发服务器
npm run dev
```

打开 http://localhost:3000

---

## 项目结构

```
yunwu-origin/
├── prisma/
│   ├── schema.prisma          # 数据模型（Series / Product / Material / Order）
│   └── seed.ts                # 种子数据（7序 + 20作品 + 7材料）
├── src/
│   ├── app/
│   │   ├── layout.tsx         # 全局布局（导航栏 + Footer）
│   │   ├── page.tsx           # 首页（Hero / 七序 / 精选 / 品牌 / 材料）
│   │   ├── about/             # 品牌故事页
│   │   ├── materials/         # 材料库页
│   │   ├── products/          # 作品列表 + 详情页
│   │   ├── series/[slug]/     # 七序专题页
│   │   ├── checkout/          # 结算页（购物袋 + 下单）
│   │   └── api/               # API 路由
│   ├── components/            # 组件
│   ├── lib/prisma.ts          # Prisma 客户端
│   └── styles/globals.css     # 全局样式 + 品牌色
├── public/images/             # 图片资源
├── .env                       # 环境变量
└── package.json
```

---

## 环境变量

参考 `.env` 文件：

```env
# 本地 SQLite（零配置）
DATABASE_URL="file:./yunwu.db"

# 生产 PostgreSQL
# DATABASE_URL="postgresql://user:password@host:5432/yunwu?schema=public"

NEXT_PUBLIC_SITE_URL="http://localhost:3000"
```

---

## 数据库命令

```bash
npm run db:push     # 同步 Schema 到数据库
npm run db:seed     # 播种数据
npm run db:setup    # db:push + db:seed 一键初始化
npm run db:studio   # Prisma Studio 可视化管理
```

---

## 页面清单

| 页面 | 路由 | 类型 |
|------|------|------|
| 首页 | `/` | SSR |
| 七序专题 | `/series/[slug]` | SSG |
| 作品列表 | `/products` | ISR (1h) |
| 作品详情 | `/products/[slug]` | SSR |
| 品牌故事 | `/about` | Static |
| 材料库 | `/materials` | ISR (1h) |
| 结算 | `/checkout` | Client |

---

## API 路由

| 方法 | 路由 | 说明 |
|------|------|------|
| GET | `/api/series` | 获取全部七序 |
| GET | `/api/products` | 获取作品列表（支持 ?seriesId） |
| GET | `/api/materials` | 获取材料库 |
| POST | `/api/orders` | 创建订单 |
| GET | `/api/orders` | 查询订单（支持 ?phone） |
| POST | `/api/cart` | 获取购物车作品信息 |

---

## 品牌命名约定

- ✅ 七序（非产品分类） · ✅ 作品（非产品/商品）
- ✅ 获取（非购买） · ✅ 同行者（非用户/客户）
- ✅ 允物承诺（非售后政策）

---

## Vercel 部署

1. 将项目推送到 GitHub
2. 在 Vercel 中导入项目
3. 添加环境变量 `DATABASE_URL`（指向 PostgreSQL）
4. 部署 → 绑定域名 `www.yunwuorigin.com`

```bash
# 生产构建
npm run build
npm run start
```

---

## SEO

- 首页 title: `允物 Yunwu Origin｜东方器物与天然材质设计品牌`
- 自动生成 Open Graph 元数据
- 语义化 HTML 结构
- 作品详情页结构化数据（待实现 schema.org）

---

## 图片规范

- 格式：WebP / AVIF
- 目录：`public/images/series/` `products/` `materials/` `brand/`
- 当前使用文字占位，替换图片后即可显示

---

## 品牌色系

| 用途 | 色值 |
|------|------|
| 主色 | `#F5F1EA` 允白 |
| 辅色 | `#D9CCB8` 月灰 |
| 文字 | `#2B2B2B` 松烟黑 |
| 强调 | `#8A6A44` 沉香褐 |

---

## 设计参考

无印良品 · 观夏 · 上下 · 方所 · 言几又
