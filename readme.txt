Token Usage Dashboard - Guia de Deploy
🎯 Visão Geral das Mudanças
O projeto foi atualizado para suportar:

URLs específicas para clientes: Cada cliente acessa apenas seu próprio dashboard
Dashboard admin: Você pode ver todos os projetos e gerenciar URLs dos clientes
Ciclos mensais customizados: Cada cliente pode ter um dia específico do mês para renovação
Deploy para servidor: Scripts e configurações para produção

🔧 Configuração dos Clientes
No arquivo backend/app.py, configure seus clientes na variável CLIENT_CONFIG:
pythonCLIENT_CONFIG = {
    'cliente_empresa_a': {
        'project': 'bot_sejasua',
        'name': 'Empresa A - Bot SejaSua',
        'cycle_day': 5  # Renovação dia 5 de cada mês
    },
    'cliente_empresa_b': {
        'project': 'bot_model',
        'name': 'Empresa B - Bot Model',
        'cycle_day': 15  # Renovação dia 15 de cada mês
    },
    'cliente_startup_c': {
        'project': 'bot_assistente',
        'name': 'Startup C - Assistente',
        'cycle_day': 1   # Renovação dia 1 de cada mês
    }
}
🌐 URLs de Acesso
Para Você (Admin)

Dashboard Admin: https://seudominio.com/admin

Visualiza todos os projetos
Pode alternar entre projetos
Mostra URLs dos clientes para compartilhar



Para os Clientes

Cliente Empresa A: https://seudominio.com/client/cliente_empresa_a
Cliente Empresa B: https://seudominio.com/client/cliente_empresa_b
Cliente Startup C: https://seudominio.com/client/cliente_startup_c


💡 Os clientes só veem seus próprios dados, sem opção de trocar projetos

📊 Como Funciona o Ciclo Mensal
Exemplo com cycle_day: 5

Período atual: De 05/Jan até 04/Fev
Próxima renovação: 05/Fev (zera contadores)
Se hoje for 03/Fev: Mostra consumo de 05/Jan até hoje
Se hoje for 06/Fev: Mostra consumo de 05/Fev até hoje (novo ciclo)

🚀 Deploy no Servidor
Opção 1: Deploy Tradicional

Prepare o servidor:

bash# Instale dependências no servidor
sudo apt update
sudo apt install python3 python3-venv nodejs npm nginx certbot python3-certbot-nginx

Configure o deploy script:

bash# Edite deploy.sh com suas informações
SERVER_USER="seu_usuario"
SERVER_HOST="seu_servidor.com"
DOMAIN="dashboard.seusite.com"

Execute o deploy:

bashchmod +x deploy.sh
./deploy.sh
Opção 2: Deploy com Docker

Configure variáveis de ambiente:

bash# Crie arquivo .env na raiz do projeto
LANGSMITH_API_KEY=sua_api_key_aqui
LANGSMITH_ENDPOINT=https://api.smith.langchain.com

Execute com Docker Compose:

bashdocker-compose up -d
🔧 Configurações Necessárias
1. Atualizar URLs da API
No arquivo frontend/src/config.js (criar se não existir):
javascript// Para produção
export const API_BASE_URL = 'https://seudominio.com';

// Para desenvolvimento
// export const API_BASE_URL = 'http://localhost:5000';
Depois atualize os componentes para usar esta configuração:
javascriptimport { API_BASE_URL } from '../config';

// Ao invés de:
// fetch('http://localhost:5000/api/...')

// Use:
// fetch(`${API_BASE_URL}/api/...`)
2. Configurar Nginx (se não usar Docker)
nginxserver {
    listen 80;
    server_name dashboard.seusite.com;

    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
3. SSL com Let's Encrypt
bashsudo certbot --nginx -d dashboard.seusite.com
📱 Atualizações no Frontend
Instalar nova dependência:
bashcd frontend
npm install react-router-dom@^6.26.2
Novos componentes criados:

AdminDashboard.js - Dashboard para admin
ClientDashboard.js - Dashboard para clientes
ClientTokenUsageDashboard.js - Versão específica para clientes

🔒 Segurança
Recomendações:

Firewall: Bloqueie acesso direto à porta 5000
Rate Limiting: Configure no Nginx
Logs: Monitore acessos suspeitos
Backup: Configure backup dos logs do LangSmith

Exemplo de rate limiting no Nginx:
nginxhttp {
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    
    server {
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            # resto da configuração...
        }
    }
}
📊 Monitoramento
Logs do aplicativo:
bash# Logs do sistema (se usando systemd)
sudo journalctl -u token-dashboard -f

# Logs do Docker
docker-compose logs -f token-dashboard

# Logs do Nginx
sudo tail -f /var/log/nginx/access.log
Métricas importantes para monitorar:

Uso de CPU/RAM do servidor
Número de requisições à API
Tempo de resposta
Erros 500/404

🔄 Atualizações Futuras
Para atualizar o sistema:

Faça backup dos dados e configurações
Teste localmente as mudanças
Execute deploy novamente
Verifique se tudo está funcionando

Comando rápido para redeploy:
bash./deploy.sh
❓ Troubleshooting
Problema: "Cliente não encontrado"

Verifique se o clientId na URL está correto
Confirme se está configurado no CLIENT_CONFIG

Problema: "Erro de conexão com LangSmith"

Verifique se LANGSMITH_API_KEY está configurada
Teste conectividade com a API do LangSmith

Problema: Dashboard não carrega

Verifique logs do backend: sudo journalctl -u token-dashboard -f
Confirme se o Nginx está rodando: sudo systemctl status nginx
Teste API diretamente: curl http://localhost:5000/api/health

Problema: Gráficos não aparecem

Verifique console do browser para erros JavaScript
Confirme se dados estão sendo retornados pela API
Teste com diferentes períodos

🎉 Resultado Final
Você terá:
✅ Dashboard admin com controle total
✅ URLs específicas para cada cliente
✅ Ciclos mensais personalizados
✅ Interface limpa para os clientes
✅ Deploy automatizado para produção
✅ SSL configurado automaticamente
✅ Monitoramento de logs e métricas
📞 Suporte
Se precisar de ajuda com alguma configuração específica ou encontrar problemas, me informe!