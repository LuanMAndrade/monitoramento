# deploy.sh - Script para deploy no servidor
#!/bin/bash

echo "🚀 Deploy do Dashboard Token Usage"

# Configurações (ajuste conforme seu servidor)
SERVER_USER="root"
SERVER_HOST="srv928375.hstgr.cloud"
SERVER_PATH="/var/www/token-dashboard"
DOMAIN="31.97.92.54"

# Função de cleanup local
cleanup_local() {
    echo "🧹 Limpando arquivos temporários..."
    rm -rf build_temp/
}

# Capturar Ctrl+C para cleanup
trap cleanup_local SIGINT

echo "📦 Preparando build..."

# Criar diretório temporário
mkdir -p build_temp
cd build_temp

# Copiar arquivos do projeto
cp -r ../backend .
cp -r ../frontend .

echo "🔧 Configurando backend para produção..."

# Atualizar configurações do backend para produção
cat > backend/app.py << 'EOF'
# backend/app.py - Versão de Produção
import os
from datetime import datetime, timedelta
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from langsmith import Client
from dotenv import load_dotenv
import logging

# Configurar logging para produção
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Carregar variáveis de ambiente
load_dotenv()

app = Flask(__name__, static_folder='../frontend/build', static_url_path='')
CORS(app)

# Configuração de clientes - CONFIGURE AQUI SEUS CLIENTES
CLIENT_CONFIG = {
    'client1': {
        'project': 'bot_sejasua',
        'name': 'Cliente SejaSua',
        'cycle_day': 5
    },
    'client2': {
        'project': 'bot_model', 
        'name': 'Cliente Model',
        'cycle_day': 10
    }
}

# [Resto do código do backend aqui - copiar da versão atualizada]
# ... (todas as funções do backend)

# Rota para servir o frontend
@app.route('/')
def serve_admin():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/admin')
def serve_admin_explicit():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/client/<path:path>')
def serve_client(path):
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    try:
        return send_from_directory(app.static_folder, path)
    except:
        return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
EOF

echo "🎨 Fazendo build do frontend..."
cd frontend

# Instalar dependências
npm install

# Configurar URL da API para produção
cat > src/config.js << EOF
// Configuração da API para produção
export const API_BASE_URL = window.location.origin;
EOF

# Atualizar imports nos componentes para usar a config
# (Aqui você precisaria atualizar os componentes para usar API_BASE_URL)

# Build do frontend
npm run build

echo "📤 Enviando arquivos para o servidor..."

# Criar estrutura no servidor
ssh $SERVER_USER@$SERVER_HOST "mkdir -p $SERVER_PATH"

# Enviar backend
scp -r ../backend/ $SERVER_USER@$SERVER_HOST:$SERVER_PATH/

# Enviar build do frontend
scp -r build/ $SERVER_USER@$SERVER_HOST:$SERVER_PATH/frontend/

echo "⚙️ Configurando servidor..."

# Script para executar no servidor
ssh $SERVER_USER@$SERVER_HOST << EOF
    cd $SERVER_PATH
    
    # Instalar dependências Python
    python3 -m venv venv
    source venv/bin/activate
    pip install -r backend/requirements.txt
    
    # Configurar systemd service
    sudo tee /etc/systemd/system/token-dashboard.service > /dev/null << 'EOL'
[Unit]
Description=Token Usage Dashboard
After=network.target

[Service]
Type=simple
User=$SERVER_USER
WorkingDirectory=$SERVER_PATH/backend
Environment=PATH=$SERVER_PATH/venv/bin
ExecStart=$SERVER_PATH/venv/bin/python app.py
Restart=always

[Install]
WantedBy=multi-user.target
EOL

    # Ativar e iniciar serviço
    sudo systemctl daemon-reload
    sudo systemctl enable token-dashboard
    sudo systemctl start token-dashboard
EOF

echo "🌐 Configurando Nginx..."

# Configuração do Nginx
ssh $SERVER_USER@$SERVER_HOST "sudo tee /etc/nginx/sites-available/token-dashboard" << EOF
server {
    listen 80;
    server_name $DOMAIN;

    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Ativar site
ssh $SERVER_USER@$SERVER_HOST << EOF
    sudo ln -sf /etc/nginx/sites-available/token-dashboard /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl reload nginx
EOF

echo "🔒 Configurando SSL com Let's Encrypt..."
ssh $SERVER_USER@$SERVER_HOST "sudo certbot --nginx -d $DOMAIN"

# Cleanup
cd ../..
cleanup_local

echo "✅ Deploy concluído!"
echo "🌐 Acesse: https://$DOMAIN"
echo ""
echo "📋 URLs configuradas:"
echo "   Admin: https://$DOMAIN/admin"
echo "   Cliente 1: https://$DOMAIN/client/client1"
echo "   Cliente 2: https://$DOMAIN/client/client2"
echo ""
echo "🔧 Para verificar logs: ssh $SERVER_USER@$SERVER_HOST 'sudo journalctl -u token-dashboard -f'"

# docker-compose.yml - Alternativa com Docker
cat > ../docker-compose.yml << 'EOF'
version: '3.8'

services:
  token-dashboard:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "5000:5000"
    environment:
      - LANGSMITH_API_KEY=${LANGSMITH_API_KEY}
      - LANGSMITH_ENDPOINT=${LANGSMITH_ENDPOINT}
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - token-dashboard
    restart: unless-stopped
EOF

# Dockerfile
cat > ../Dockerfile << 'EOF'
FROM node:18-alpine AS frontend-build

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

FROM python:3.9-slim

WORKDIR /app

# Instalar dependências do sistema
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Instalar dependências Python
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código do backend
COPY backend/ ./

# Copiar build do frontend
COPY --from=frontend-build /app/frontend/build ./frontend/build

# Criar diretório para logs
RUN mkdir -p logs

# Expor porta
EXPOSE 5000

# Comando para iniciar
CMD ["python", "app.py"]
EOF

echo "📝 Arquivos de deploy criados:"
echo "   - deploy.sh (script de deploy tradicional)"
echo "   - docker-compose.yml (deploy com Docker)"
echo "   - Dockerfile"