#!/usr/bin/env bash
# ============================================================
#  CC 生日快樂 · aaPanel + Cloudflare 專用安裝腳本
#  一條指令完成：clone 程式碼、安裝依賴、產生金鑰、systemd 啟動
#  剩下的只有兩個網頁操作：
#    1. Cloudflare 加 DNS 紀錄（橘雲 = 自動 SSL）
#    2. aaPanel 加反向代理 → 127.0.0.1:3456
#
#  用法（SSH 登入伺服器後）：
#    bash <(curl -fsSL https://raw.githubusercontent.com/wing5600/cc-birthday/main/setup-aapanel.sh)
# ============================================================
set -euo pipefail

info() { printf '\033[1;36m[步驟]\033[0m %s\n' "$*"; }
ok()   { printf '\033[1;32m[完成]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[注意]\033[0m %s\n' "$*"; }
err()  { printf '\033[1;31m[錯誤]\033[0m %s\n' "$*" >&2; }

REPO="https://github.com/wing5600/cc-birthday.git"
APP_DIR="/www/wwwroot/cc-birthday"
PORT=3456

# ---------- 權限 ----------
if [ "$(id -u)" -ne 0 ]; then
  if command -v sudo >/dev/null 2>&1; then SUDO="sudo"; else
    err "請用 root 執行，或先安裝 sudo"; exit 1
  fi
else SUDO=""; fi

# ---------- git ----------
if ! command -v git >/dev/null 2>&1; then
  info "安裝 git"
  $SUDO apt-get update -qq && $SUDO apt-get install -y -qq git
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
  $SUDO git -C "$APP_DIR" pull --ff-only
else
  info "下載程式碼到 $APP_DIR"
  $SUDO mkdir -p /www/wwwroot
  $SUDO git clone "$REPO" "$APP_DIR"
fi

# ---------- 安裝依賴 ----------
info "安裝後端依賴"
cd "$APP_DIR/server"
$SUDO npm install --omit=dev --no-fund --no-audit

# ---------- 產生 .env ----------
if [ ! -f .env ]; then
  info "產生 VAPID 金鑰與管理密碼"
  KEYS=$($SUDO node -e "const wp=require('web-push');const k=wp.generateVAPIDKeys();process.stdout.write(k.publicKey+' '+k.privateKey)")
  PUB=$(echo "$KEYS" | cut -d' ' -f1)
  PRIV=$(echo "$KEYS" | cut -d' ' -f2)
  ADMIN=$(openssl rand -hex 16 2>/dev/null || $SUDO node -e "console.log(require('crypto').randomBytes(16).toString('hex'))")
  $SUDO tee .env >/dev/null <<EOF
VAPID_PUBLIC_KEY=$PUB
VAPID_PRIVATE_KEY=$PRIV
ADMIN_KEY=$ADMIN
BACKEND_URL=
EOF
  ok ".env 已建立"
else
  ok ".env 已存在，沿用現有設定"
  ADMIN=$(grep '^ADMIN_KEY=' .env | cut -d= -f2-)
fi

# aaPanel 慣例：網站檔案用 www 使用者
if id www >/dev/null 2>&1; then $SUDO chown -R www:www "$APP_DIR"; fi

# ---------- systemd 常駐啟動 ----------
if command -v systemctl >/dev/null 2>&1; then
  info "設定 systemd 服務（開機自啟、當掉自動重開）"
  NODE_BIN=$(command -v node)
  $SUDO sed -e "s|/usr/bin/node|$NODE_BIN|" "$APP_DIR/cc-birthday.service" \
    | $SUDO tee /etc/systemd/system/cc-birthday.service >/dev/null
  $SUDO systemctl daemon-reload
  $SUDO systemctl enable --now cc-birthday
  $SUDO systemctl restart cc-birthday
  sleep 2
  if curl -fsS "http://127.0.0.1:$PORT/health" >/dev/null 2>&1; then
    ok "後端已在本機 $PORT 埠運作"
  else
    warn "健康檢查失敗，請查看：sudo journalctl -u cc-birthday -n 50"
  fi
else
  warn "找不到 systemctl，請改用 aaPanel 的 PM2 / Node 管理器啟動 server.js"
fi

# ---------- 完成 ----------
printf '\n\033[1;32m🎉 後端安裝完成！\033[0m\n\n'
echo "🔑 管理密碼（ADMIN_KEY）： $ADMIN"
echo
echo "剩下兩個網頁操作："
echo "  1. Cloudflare → DNS → 新增 A 紀錄：子網域（例如 cc.sunhingindo.com）"
echo "     → 指向本機 IP → 開啟 Proxy（橘雲，自動有 SSL）"
echo "  2. aaPanel →「網站」→ 新增該網域的網站 → 網站設定 →「反向代理」→"
echo "     新增 → 目標 URL 填 http://127.0.0.1:$PORT"
echo
echo "  ※ Cloudflare 的 SSL/TLS 模式記得設為 Flexible（或 Full）"
echo "  ※ 完成後驗證： curl https://你的子網域/health"
echo
