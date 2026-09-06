#!/usr/bin/env bash
# ============================================================
#  CC 生日快樂 · 後端 All-in-One 安裝腳本
#  適用：Ubuntu / Debian（其他發行版請參考 README 手動安裝）
#
#  用法（在伺服器上執行）：
#    bash <(curl -fsSL https://raw.githubusercontent.com/wing5600/cc-birthday/main/setup.sh)
#  或 clone 後： bash setup.sh
# ============================================================
set -euo pipefail

info() { printf '\033[1;36m[步驟]\033[0m %s\n' "$*"; }
ok()   { printf '\033[1;32m[完成]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[注意]\033[0m %s\n' "$*"; }
err()  { printf '\033[1;31m[錯誤]\033[0m %s\n' "$*" >&2; }

REPO="https://github.com/wing5600/cc-birthday.git"
APP_DIR="/opt/cc-birthday"
PORT=3000

# ---------- aaPanel 偵測 ----------
if [ -d /www/server/panel ]; then
  warn "偵測到 aaPanel！建議改用 aaPanel 專用流程（網站/SSL/反向代理在面板操作）："
  echo "      bash <(curl -fsSL https://raw.githubusercontent.com/wing5600/cc-birthday/main/setup-aapanel.sh)"
  read -rp "仍要用本腳本（systemd + 可選 Caddy，不經面板）繼續嗎？[y/N]: " FORCE
  [ "${FORCE:-n}" = "y" ] || [ "${FORCE:-n}" = "Y" ] || exit 0
fi

# ---------- 權限 ----------
if [ "$(id -u)" -ne 0 ]; then
  if command -v sudo >/dev/null 2>&1; then SUDO="sudo"; else
    err "請用 root 執行，或先安裝 sudo"; exit 1
  fi
else SUDO=""; fi

# ---------- 網域 ----------
printf '\n🎂 CC 生日快樂 · 後端安裝程式\n\n'
read -rp "請輸入你的網域（例如 cc.example.com）: " DOMAIN
DOMAIN=$(echo "$DOMAIN" | tr -d '[:space:]' | sed 's|https\?://||;s|/$||')
if [ -z "$DOMAIN" ]; then err "網域不能為空"; exit 1; fi
warn "請確認 $DOMAIN 的 DNS A 紀錄已指向這台伺服器的 IP"
read -rp "按 Enter 繼續，或 Ctrl+C 取消… " _

# ---------- 1. 基礎套件 ----------
info "安裝 git / curl"
if command -v apt-get >/dev/null 2>&1; then
  $SUDO apt-get update -qq
  $SUDO apt-get install -y -qq git curl openssl
else
  warn "偵測不到 apt-get，請自行確認已安裝 git、curl、openssl"
fi

# ---------- 2. Node.js ----------
if command -v node >/dev/null 2>&1 && [ "$(node -v | sed 's/v//;s/\..*//')" -ge 18 ] 2>/dev/null; then
  ok "Node.js $(node -v) 已安裝"
else
  info "安裝 Node.js 20（NodeSource）"
  if command -v apt-get >/dev/null 2>&1; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | $SUDO bash -
    $SUDO apt-get install -y -qq nodejs
  else
    err "請先手動安裝 Node.js 18+：https://nodejs.org"; exit 1
  fi
fi

# ---------- 3. 取得程式碼 ----------
if [ -d "$APP_DIR/.git" ]; then
  info "更新現有程式碼"
  $SUDO git -C "$APP_DIR" pull --ff-only
else
  info "下載程式碼到 $APP_DIR"
  $SUDO git clone "$REPO" "$APP_DIR"
fi

# ---------- 4. 安裝後端依賴 ----------
info "安裝後端依賴"
cd "$APP_DIR/server"
$SUDO npm install --omit=dev --no-fund --no-audit

# ---------- 5. 產生 .env（已存在則沿用） ----------
if [ ! -f .env ]; then
  info "產生 VAPID 金鑰與管理密碼"
  KEYS=$($SUDO node -e "const wp=require('web-push');const k=wp.generateVAPIDKeys();process.stdout.write(k.publicKey+' '+k.privateKey)")
  PUB=$(echo "$KEYS" | cut -d' ' -f1)
  PRIV=$(echo "$KEYS" | cut -d' ' -f2)
  ADMIN=$(openssl rand -hex 16)
  $SUDO tee .env >/dev/null <<EOF
VAPID_PUBLIC_KEY=$PUB
VAPID_PRIVATE_KEY=$PRIV
ADMIN_KEY=$ADMIN
BACKEND_URL=https://$DOMAIN
EOF
  ok ".env 已建立"
else
  ok ".env 已存在，沿用現有設定"
  ADMIN=$(grep '^ADMIN_KEY=' .env | cut -d= -f2-)
fi

# ---------- 6. systemd 服務 ----------
info "設定 systemd 服務（開機自啟、當掉重開）"
NODE_BIN=$(command -v node)
$SUDO sed -e "s|/usr/bin/node|$NODE_BIN|" "$APP_DIR/cc-birthday.service" \
  | $SUDO tee /etc/systemd/system/cc-birthday.service >/dev/null
$SUDO systemctl daemon-reload
$SUDO systemctl enable --now cc-birthday
$SUDO systemctl restart cc-birthday

# ---------- 7. HTTPS / 反向代理 ----------
echo
read -rp "要安裝 Caddy 自動處理 HTTPS 嗎？（伺服器上已有 Nginx/面板管理 SSL 的話選 n）[y/N]: " USE_CADDY
if [ "${USE_CADDY:-n}" = "y" ] || [ "${USE_CADDY:-n}" = "Y" ]; then
  if ! command -v caddy >/dev/null 2>&1; then
    info "安裝 Caddy"
    if command -v apt-get >/dev/null 2>&1; then
      $SUDO apt-get install -y -qq debian-keyring debian-archive-keyring apt-transport-https
      curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
        | $SUDO gpg --yes --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
      curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
        | $SUDO tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
      $SUDO apt-get update -qq
      $SUDO apt-get install -y -qq caddy
    else
      err "請先手動安裝 Caddy：https://caddyserver.com/docs/install"; exit 1
    fi
  fi

  info "設定 Caddy 反向代理（$DOMAIN → 127.0.0.1:$PORT）"
  if [ -f /etc/caddy/Caddyfile ] && grep -q "$DOMAIN" /etc/caddy/Caddyfile; then
    ok "Caddyfile 已包含 $DOMAIN，略過"
  elif [ -f /etc/caddy/Caddyfile ]; then
    $SUDO cp /etc/caddy/Caddyfile "/etc/caddy/Caddyfile.bak.$(date +%Y%m%d%H%M%S)"
    printf '\n%s {\n\treverse_proxy 127.0.0.1:%s\n}\n' "$DOMAIN" "$PORT" \
      | $SUDO tee -a /etc/caddy/Caddyfile >/dev/null
    ok "已把 $DOMAIN 附加到現有 Caddyfile（原檔已備份）"
  else
    printf '%s {\n\treverse_proxy 127.0.0.1:%s\n}\n' "$DOMAIN" "$PORT" \
      | $SUDO tee /etc/caddy/Caddyfile >/dev/null
    ok "Caddyfile 已建立"
  fi
  $SUDO systemctl reload caddy 2>/dev/null || $SUDO systemctl restart caddy
else
  warn "跳過 Caddy。請記得在你的面板 / Nginx 設定："
  echo "      https://$DOMAIN  →  反向代理到  http://127.0.0.1:$PORT （需啟用 SSL）"
fi

# ---------- 8. 防火牆 ----------
if command -v ufw >/dev/null 2>&1 && $SUDO ufw status 2>/dev/null | grep -q "Status: active"; then
  info "ufw 防火牆開放 80/443"
  $SUDO ufw allow 80,443/tcp >/dev/null
fi

# ---------- 9. 健康檢查 ----------
sleep 2
if curl -fsS "http://127.0.0.1:$PORT/health" >/dev/null 2>&1; then
  ok "後端服務運作中"
else
  warn "後端健康檢查失敗，請查看：sudo journalctl -u cc-birthday -n 50"
fi

# ---------- 完成 ----------
printf '\n\033[1;32m🎉 部署完成！\033[0m\n\n'
echo "🎂 後台管理介面：  https://$DOMAIN/admin"
echo "🔑 管理密碼：      $ADMIN"
echo "💕 頁面鏡像：      https://$DOMAIN/  （伺服器也會直接伺服生日頁面）"
echo
echo "📱 最後一步 — 讓 GitHub Pages 前端連到這台伺服器："
echo "   1. 打開 https://github.com/wing5600/cc-birthday/edit/main/push.js"
echo "   2. 把第一段的 BACKEND_URL 改成："
printf '      \033[1;33mconst BACKEND_URL = '"'"'https://%s'"'"';\033[0m\n' "$DOMAIN"
echo "   3. 按 Commit changes，等約 1 分鐘 Pages 更新"
echo
echo "🧪 測試指令： curl https://$DOMAIN/health"
echo
