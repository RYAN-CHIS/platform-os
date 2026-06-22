#!/usr/bin/env bash
# ============================================
# 允物 ERP · Vercel Blob 存储配置脚本
# 用于在 Vercel 项目中配置 BLOB_READ_WRITE_TOKEN
# ============================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  允物 ERP · Vercel Blob 存储配置${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ── 步骤 1: 获取 Token ──
echo -e "${YELLOW}📋 请按以下步骤获取 BLOB_READ_WRITE_TOKEN：${NC}"
echo ""
echo -e "  1. 打开 ${CYAN}https://vercel.com/dashboard${NC}"
echo -e "  2. 选择项目 ${CYAN}yunwu-erp${NC}"
echo -e "  3. 顶部标签 → ${CYAN}Storage${NC}"
echo -e "  4. 找到 ${CYAN}Blob Store${NC}（如未创建，点击 Create → Blob Store）"
echo -e "  5. 点击已创建的 Blob Store，复制页面上显示的 ${CYAN}Token${NC}"
echo ""
echo -e "  Token 格式类似: ${CYAN}vercel_blob_rw_xxxxxxxxxxxxx_xxxxxxxxxxxxxxxxxxxxx${NC}"
echo ""

read -r -p "请粘贴 BLOB_READ_WRITE_TOKEN（直接回车跳过）: " TOKEN

if [ -z "$TOKEN" ]; then
  echo ""
  echo -e "${YELLOW}⚠️  未提供 Token。已跳动手动配置步骤。${NC}"
  echo ""
  echo -e "  之后可以手动运行: ${CYAN}vercel env add BLOB_READ_WRITE_TOKEN production${NC}"
  exit 0
fi

# ── 步骤 2: 检查 Vercel CLI ──
echo ""
echo -e "${YELLOW}🔍 检查 Vercel CLI…${NC}"

if ! command -v vercel &>/dev/null; then
  echo -e "  Vercel CLI 未安装，正在安装…"
  npm install -g vercel
fi

echo -e "  ${GREEN}✓${NC} Vercel CLI 已就绪"

# ── 步骤 3: 认证（如果需要）──
echo ""
echo -e "${YELLOW}🔐 检查 Vercel 认证状态…${NC}"

if ! vercel whoami &>/dev/null; then
  echo -e "  需要登录 Vercel。浏览器将打开登录页面…"
  vercel login
fi

echo -e "  ${GREEN}✓${NC} 已认证为 $(vercel whoami 2>/dev/null || echo 'unknown')"

# ── 步骤 4: 链接项目 ──
echo ""
echo -e "${YELLOW}🔗 链接到 Vercel 项目…${NC}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# 尝试链接，如果已链接则跳过
if [ -f ".vercel/project.json" ]; then
  echo -e "  ${GREEN}✓${NC} 项目已链接"
else
  echo -e "  正在搜索 yunwu-erp 项目…"
  vercel link --yes --project yunwu-erp 2>/dev/null || vercel link
  echo -e "  ${GREEN}✓${NC} 项目链接完成"
fi

# ── 步骤 5: 设置环境变量 ──
echo ""
echo -e "${YELLOW}🔧 添加 BLOB_READ_WRITE_TOKEN 环境变量…${NC}"

# 先尝试删除旧值（忽略错误）
vercel env rm BLOB_READ_WRITE_TOKEN production 2>/dev/null || true

# 添加新值（会有敏感信息提示，需要确认）
echo "$TOKEN" | vercel env add BLOB_READ_WRITE_TOKEN production --force

echo -e "  ${GREEN}✓${NC} BLOB_READ_WRITE_TOKEN 已添加到 Production 环境"

# ── 步骤 6: 验证 ──
echo ""
echo -e "${YELLOW}🔍 验证环境变量…${NC}"

if vercel env ls | grep -q "BLOB_READ_WRITE_TOKEN"; then
  echo -e "  ${GREEN}✓${NC} BLOB_READ_WRITE_TOKEN 已存在于环境变量列表中"
else
  echo -e "  ${YELLOW}⚠${NC}  未能确认环境变量是否已添加，请手动检查"
fi

# ── 步骤 7: 触发 Redeploy ──
echo ""
echo -e "${YELLOW}🚀 触发重新部署…${NC}"

# 获取最新 production deployment 并 redeploy
DEPLOY_ID=$(vercel redeploy --yes 2>/dev/null || echo "")
if [ -n "$DEPLOY_ID" ]; then
  echo -e "  ${GREEN}✓${NC} Redeploy 已触发: ${DEPLOY_ID}"
else
  echo -e "  ${YELLOW}⚠${NC}  无法通过 CLI 触发 redeploy。请在 Vercel Dashboard → Deployments → 最新 Production 部署 → 三点菜单 → Redeploy"
fi

# ── 完成 ──
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✅ Blob 存储配置完成！${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  等待部署完成后，访问 ${CYAN}https://erp.yunwuorigin.com/media${NC}"
echo -e "  上传按钮应变为可用状态，不再显示「Blob 存储未配置」警告。"
echo ""
