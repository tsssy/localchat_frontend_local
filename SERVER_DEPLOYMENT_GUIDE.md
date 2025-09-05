### LoveLush 服务器部署与配置指南（从 ngrok 到线上）

本指南帮助你将当前本地运行的项目部署到服务器：
- 后端 FastAPI 作为 systemd 服务，监听 9000
- 前端构建后由 Nginx 提供静态资源
- Telegram Mini App 与 Webhook（带 secret）对接
- Pusher/Soketi、CORS、反向代理与 HTTPS 配置

---

### 前置准备
- 两个域名/子域名（建议）：
  - 前端：`app.yourdomain.com`
  - 后端：`api.yourdomain.com`
- DNS A 记录指向服务器公网 IP

---

### 安装系统依赖
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx python3-pip python3-venv git
sudo apt install -y certbot python3-certbot-nginx
```

---

### 部署后端（systemd + Uvicorn）
#### 目录与代码
```bash
sudo mkdir -p /opt/lovelush/backend
sudo chown -R $USER:$USER /opt/lovelush/backend
cd /opt/lovelush/backend
git clone <你的后端仓库> .
```

#### 虚拟环境与依赖
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt  # 或按你的项目安装
```

#### 后端环境变量 `.env`
将以下内容保存到 `/opt/lovelush/backend/.env`（按需替换）：
```env
# 基础
APP_NAME=LoveLush Backend
APP_VERSION=1.0.0
DEBUG=false

# Mongo
MONGO_URI=mongodb://localhost:27017
MONGODB_NAME=lovelush_divination

# Token
SECRET_KEY=<生成随机串>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# CORS（生产建议白名单）
CORS_ORIGINS='["https://app.yourdomain.com"]'

# Telegram
TELEGRAM_BOT_TOKEN=<你的BotToken>
TELEGRAM_WEBHOOK_URL=https://api.yourdomain.com/api/v1/telegram/webhook
TELEGRAM_WEBHOOK_SECRET=778998
TELEGRAM_MINI_APP_URL=https://app.yourdomain.com

# Pusher / Soketi（按你的外部服务填写）
PUSHER_APP_ID=<app-id>
PUSHER_KEY=<app-key>
PUSHER_SECRET=<app-secret>
PUSHER_CLUSTER=mt1

# 后端到 Pusher/Soketi 的内部连接
PUSHER_HOST=<soketi内部IP或域名>
PUSHER_PORT=6001
PUSHER_USE_TLS=false

# 提供给前端的外部接入配置（/pusher/config 返回）
PUSHER_EXTERNAL_HOST=<外网可达的 soketi/pusher 域名>
PUSHER_EXTERNAL_WS_PATH=/ws
PUSHER_EXTERNAL_WSS_PATH=/ws
PUSHER_EXTERNAL_PORT=443
PUSHER_EXTERNAL_USE_TLS=true
```

说明：
- 代码中已放宽 GET `/api/v1/pusher/config` 的鉴权，便于前端拿配置。
- CORS 采用 `allow_credentials=false` 搭配白名单域，适配 Telegram WebView。

#### systemd 服务
创建 `/etc/systemd/system/lovelush-backend.service`：
```ini
[Unit]
Description=LoveLush FastAPI Backend
After=network.target

[Service]
User=www-data
WorkingDirectory=/opt/lovelush/backend
Environment="PYTHONUNBUFFERED=1"
ExecStart=/opt/lovelush/backend/.venv/bin/uvicorn main:app --host 0.0.0.0 --port 9000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

启用并启动：
```bash
sudo systemctl daemon-reload
sudo systemctl enable lovelush-backend
sudo systemctl start lovelush-backend
sudo systemctl status lovelush-backend -n 100
```

健康检查：
```bash
curl -s http://127.0.0.1:9000/health
```

---

### 部署前端（Nginx 静态资源）
#### 本地构建
在 `lovechat_frontend_formal/config/config.ts` 设置后端地址：
```ts
static readonly BACKEND_BASE_URL = "https://api.yourdomain.com";
```
构建：
```bash
cd lovechat_frontend_formal
npm ci
npm run build
```
产物在 `build/`。

#### 上传到服务器
```bash
sudo mkdir -p /var/www/lovelush_frontend
sudo chown -R $USER:$USER /var/www/lovelush_frontend
rsync -avz build/ <server>:/var/www/lovelush_frontend/
```

#### Nginx 前端站点
`/etc/nginx/sites-available/lovelush-frontend.conf`：
```nginx
server {
    listen 80;
    server_name app.yourdomain.com;

    root /var/www/lovelush_frontend;
    index index.html;

    location /assets/ {
        try_files $uri =404;
        access_log off;
        expires 7d;
    }

    location / {
        try_files $uri /index.html;
    }
}
```
启用并重载：
```bash
sudo ln -s /etc/nginx/sites-available/lovelush-frontend.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

### Nginx 反代后端（推荐）
`/etc/nginx/sites-available/lovelush-backend.conf`：
```nginx
upstream lovelush_backend { server 127.0.0.1:9000; }

server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://lovelush_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```
启用：
```bash
sudo ln -s /etc/nginx/sites-available/lovelush-backend.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

### HTTPS（Let’s Encrypt）
```bash
sudo certbot --nginx -d app.yourdomain.com
sudo certbot --nginx -d api.yourdomain.com
sudo certbot renew --dry-run
```

---

### Telegram Webhook（带 secret）
后端与 HTTPS 就绪后：
```bash
export BOT_TOKEN="<你的_Bot_Token>"
export WEBHOOK_URL="https://api.yourdomain.com/api/v1/telegram/webhook"
export SECRET="778998"

curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
  -d url="${WEBHOOK_URL}" \
  -d secret_token="${SECRET}"

curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo"
```

Mini App 在 BotFather 中设置：
- URL：`https://app.yourdomain.com/`
- 后端 `.env` 中 `TELEGRAM_MINI_APP_URL=https://app.yourdomain.com`

---

### Pusher/Soketi 要点
- 前端启动会 GET `https://api.yourdomain.com/api/v1/pusher/config` 获取配置。
- 该接口返回字段需与你的 Pusher/Soketi 外部接入匹配：
  - `key`、`cluster`
  - `wsHost`、`wsPath`、`wssPath`、`wssPort`、`forceTLS`
- 如使用自建 soketi，保证其域名（如 `soketi.yourdomain.com`）在公网可达，并与 `.env` 的 `PUSHER_EXTERNAL_*` 对应。
- 前端鉴权会 POST `/api/v1/pusher/auth`，Nginx 需代理到后端。

---

### 关键自检清单
- 后端健康：
```bash
curl -s https://api.yourdomain.com/health
```
- Pusher 配置：
```bash
curl -i https://api.yourdomain.com/api/v1/pusher/config
```
- 前端：访问 `https://app.yourdomain.com`
- Telegram：
  - `/start` 能收到欢迎消息
  - 按钮打开 Mini App 且在 Telegram 内加载

若初始化失败，优先检查：
- `config.ts` 的 `BACKEND_BASE_URL` 是否为 `https://api.yourdomain.com`
- `/api/v1/pusher/config` 是否 200
- `.env` 的 `TELEGRAM_MINI_APP_URL` 与 Mini App URL 是否一致
- `getWebhookInfo` 返回的 webhook 与 `secret_token`

---

### 运维常用命令
```bash
# 后端日志
sudo journalctl -u lovelush-backend -f -n 200

# Nginx 检查与重载
sudo nginx -t && sudo systemctl reload nginx
sudo tail -f /var/log/nginx/access.log /var/log/nginx/error.log

# 证书续期
sudo certbot renew --dry-run
```

---

### 与本地开发的差异小结
- 不再使用 ngrok；线上以正式域名和 HTTPS 提供访问。
- Telegram 按钮已改为 Web App 按钮，避免外跳浏览器。
- 为避免头像“闪图”，前端已移除外链占位图（需要可换成本地占位或 skeleton）。

如需我按照你的实际域名与目录生成可直接启用的 Nginx 与 systemd 文件，请告知：域名、部署路径、soketi/pusher 接入方式。


