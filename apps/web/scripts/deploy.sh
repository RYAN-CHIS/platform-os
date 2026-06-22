#!/bin/bash
# ═══════════════════════════════════════════
#  允物官网 — 一键部署脚本
#  本地构建 → Git 推送 → Vercel 自动上线
# ═══════════════════════════════════════════

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo -e "${BLUE}  允物官网 (yunwu-origin) 部署脚本${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo ""

# ── Step 1: 检查环境变量 ──
echo -e "${YELLOW}[1/5] 检查环境变量...${NC}"
if [ -z "$DATABASE_URL" ]; then
    if [ -f .env ]; then
        export $(grep -v '^#' .env | xargs)
        echo -e "${GREEN}  ✓ 已从 .env 加载环境变量${NC}"
    else
        echo -e "${RED}  ✗ 未找到 .env 文件或 DATABASE_URL 环境变量${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}  ✓ DATABASE_URL 已设置${NC}"
fi

# ── Step 2: 代码格式检查（跳过，可选） ──
echo -e "${YELLOW}[2/5] 检查 Git 状态...${NC}"
if ! git diff-index --quiet HEAD -- 2>/dev/null; then
    echo -e "${YELLOW}  ⚠ 有未提交的更改${NC}"
else
    echo -e "${GREEN}  ✓ 工作区干净${NC}"
fi

# ── Step 3: 本地构建验证 ──
echo -e "${YELLOW}[3/5] 本地构建验证...${NC}"
if npm run build 2>&1 | tail -5; then
    echo -e "${GREEN}  ✓ 构建成功${NC}"
else
    echo -e "${RED}  ✗ 构建失败，请检查错误信息${NC}"
    exit 1
fi

# ── Step 4: Git 提交与推送 ──
echo -e "${YELLOW}[4/5] Git 提交与推送...${NC}"

# 获取当前分支
BRANCH=$(git branch --show-current 2>/dev/null || echo "main")
echo -e "  当前分支: ${BRANCH}"

# 如果没有未提交的更改，跳过提交
if git diff-index --quiet HEAD -- 2>/dev/null; then
    echo -e "${GREEN}  无更改需要提交${NC}"
else
    # 自动生成提交信息
    TIMESTAMP=$(date "+%Y-%m-%d %H:%M")
    COMMIT_MSG="deploy: ${TIMESTAMP} — 自动部署"
    
    git add -A
    git commit -m "$COMMIT_MSG"
    echo -e "${GREEN}  ✓ 已提交: ${COMMIT_MSG}${NC}"
fi

# 推送到远程
echo -e "  推送中..."
git push origin "$BRANCH" 2>&1

echo -e "${GREEN}  ✓ 已推送到 origin/${BRANCH}${NC}"

# ── Step 5: 部署状态 ──
echo -e "${YELLOW}[5/5] Vercel 自动部署已触发${NC}"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ 部署流程完成！${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo ""
echo -e "  Vercel 将自动构建并部署到:"
echo -e "  ${BLUE}🌐 https://www.yunwuorigin.com${NC}"
echo ""
echo -e "  查看部署进度:"
echo -e "  ${BLUE}📊 https://vercel.com/dashboard${NC}"
echo ""
echo -e "  ⚠️  首次部署前请确保 Vercel 中已设置以下环境变量:"
echo -e "  ${YELLOW}  - DATABASE_URL (Neon 连接池 URL)${NC}"
echo -e "  ${YELLOW}  - DIRECT_DATABASE_URL (Neon 直连 URL)${NC}"
echo ""
