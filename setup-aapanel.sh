#!/usr/bin/env bash
# ============================================================
#  CC 生日快樂 · aaPanel 專用安裝腳本
#  只做「應用程式」部分：clone 程式碼、安裝依賴、產生金鑰
#  網站 / SSL / 反向代理請在 aaPanel 網頁介面操作（見 README）
#
#  用法（SSH 登入伺服器後）：
#    bash <(curl -fsSL https://raw.githubusercontent.com/wing5600/cc-birthday/main/setup-aapanel.sh)
# ============================================================
set -euo pipefail

info() { printf '\033[1;36m[步驟]\033[0m %s\n' "$*"; }
ok()   { printf '\033[1;32m[完成]\033[0m %s\n' "$*"; }
err()  { printf '\033[1;31m[錯誤]\033[0m %s\n' "$*" >&2; }

REPO="https://github.com/wing5600/cc-birthday.git"
APP_DIR="/www/wwwroot/cc-birthday"

# ---------- git ----------
if ! command -v git >/dev/null 2>&1; then
  info "安裝 git"
  apt-get update -qq && apt-get install -y -qq git
fi

# ---------- node（aaPanel 的 Node 版本管理器裝的 node 不一定在 PATH） ----------
if ! command -v node >/dev/null 2>&1; then
  for d in /www/server/nvm/versions/node/*/bin /www/server/nodejs/*/bin /usr/local/bin; do
    if [ -x "$d/node" ]; then export PATH="$d:$PATH"; break; fi
  done
fi
if ! command -v node >/dev/null 2>&1; then
  err "找不到 Node.js。請先到 aaPanel →「軟體商店」安裝 Node 版本管理器並安裝 Node 18+，再重跑本腳本"
  exit 1
fi
ok "Node.js $(node -v)"

# ---------- 取得程式碼 ----------
if [ -d "$APP_DIR/.git" ]; then
  info "更新現有程式碼"
  git -C "$APP_DIR" pull --ff-only
else
  info "下載程式碼到 $APP_DIR"
  mkdir -p /www/wwwroot
  git clone "$REPO" "$APP_DIR"
fi

# ---------- 安裝依賴 ----------
info "安裝後端依賴"
cd "$APP_DIR/server"
npm install --omit=dev --no-fund --no-audit

# ---------- 產生 .env ----------
if [ ! -f .env ]; then
  info "產生 VAPID 金鑰與管理密碼"
  KEYS=$(node -e "const wp=require('web-push');const k=wp.generateVAPIDKeys();process.stdout.write(k.publicKey+' '+k.privateKey)")
  PUB=$(echo "$KEYS" | cut -d' ' -f1)
  PRIV=$(echo "$KEYS" | cut -d' ' -f2)
  ADMIN=$(openssl rand -hex 16 2>/dev/null || node -e "console.log(require('crypto').randomBytes(16).toString('hex'))")
  cat > .env <<EOF
VAPID_PUBLIC_KEY=$PUB
VAPID_PRIVATE_KEY=$PRIV
ADMIN_KEY=$ADMIN
BACKEND_URL=https://panel.sunhingindo.com
EOF
  ok ".env 已建立"
else
  ok ".env 已存在，沿用現有設定"
  ADMIN=$(grep '^ADMIN_KEY=' .env | cut -d= -f2-)
fi

# aaPanel 慣例：網站檔案用 www 使用者
if id www >/dev/null 2>&1; then chown -R www:www "$APP_DIR"; fi

# ---------- 完成 ----------
printf '\n\033[1;32m🎉 應用程式安裝完成！\033[0m\n\n'
echo "🔑 管理密碼（ADMIN_KEY）： $ADMIN"
echo
echo "接下來到 aaPanel 網頁介面操作："
echo "  1. 「網站」→「Node 專案」→「新增 Node 專案」"
echo "     · 網域：     panel.sunhingindo.com"
echo "     · 專案目錄： $APP_DIR/server"
echo "     · 啟動檔案： server.js"
echo "     · 埠號：     3000"
echo "  2. 網站設定 → SSL → Let's Encrypt → 申請並強制 HTTPS"
echo "  3. 驗證： curl https://panel.sunhingindo.com/health"
echo
