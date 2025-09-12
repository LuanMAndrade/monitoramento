# backend/app.py
import os
from datetime import datetime, timedelta
from flask import Flask, jsonify, request
from flask_cors import CORS
from langsmith import Client
from dotenv import load_dotenv
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Carregar variáveis de ambiente
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configuração de clientes - adicione aqui os projetos de cada cliente
CLIENT_CONFIG = {
    'client1': {
        'project': 'bot_sejasua',
        'name': 'Cliente SejaSua',
        'cycle_day': 5  # Dia do mês que inicia o ciclo
    },
    'client2': {
        'project': 'bot_model', 
        'name': 'Cliente Model',
        'cycle_day': 10
    }
    # Adicione mais clientes conforme necessário
}

def get_langsmith_client():
    """Inicializa o cliente do LangSmith"""
    try:
        client = Client(
            api_key=os.getenv('LANGSMITH_API_KEY'),
            api_url=os.getenv('LANGSMITH_ENDPOINT', 'https://api.smith.langchain.com')
        )
        return client
    except Exception as e:
        logger.error(f"Erro ao conectar com LangSmith: {e}")
        return None

def calculate_cycle_dates(cycle_day, custom_date=None):
    """
    Calcula as datas de início e fim do ciclo baseado no dia do mês especificado
    """
    if custom_date:
        current_date = datetime.strptime(custom_date, '%Y-%m-%d')
    else:
        current_date = datetime.now()
    
    current_day = current_date.day
    current_month = current_date.month
    current_year = current_date.year
    
    # Se ainda não chegou no dia do ciclo neste mês, o ciclo atual começou no mês passado
    if current_day < cycle_day:
        if current_month == 1:
            start_month = 12
            start_year = current_year - 1
        else:
            start_month = current_month - 1
            start_year = current_year
        
        start_date = datetime(start_year, start_month, cycle_day)
        end_date = datetime(current_year, current_month, cycle_day - 1, 23, 59, 59)
    else:
        # O ciclo atual começou neste mês
        start_date = datetime(current_year, current_month, cycle_day)
        
        if current_month == 12:
            end_month = 1
            end_year = current_year + 1
        else:
            end_month = current_month + 1
            end_year = current_year
        
        end_date = datetime(end_year, end_month, cycle_day - 1, 23, 59, 59)
    
    return start_date, end_date

def get_token_usage(project_name, days_back=7, cycle_day=None, custom_date=None):
    """Extrai métricas de token usage do LangSmith"""
    client = get_langsmith_client()
    if not client:
        raise Exception("Não foi possível conectar ao LangSmith")
    
    # Se cycle_day for fornecido, usar período baseado no ciclo
    if cycle_day:
        start_time, end_time = calculate_cycle_dates(cycle_day, custom_date)
        logger.info(f"Usando período de ciclo: {start_time} até {end_time}")
    else:
        # Usar período tradicional de dias
        end_time = datetime.now()
        start_time = end_time - timedelta(days=days_back)
    
    logger.info(f"Buscando dados para projeto {project_name} de {start_time} até {end_time}")
    
    try:
        # Busca as runs do projeto
        runs = list(client.list_runs(
            project_name=project_name,
            start_time=start_time,
            end_time=end_time
        ))
        
        total_input_tokens = 0
        total_output_tokens = 0
        total_cost = 0
        run_count = 0
        
        for run in runs:
            run_count += 1
            if hasattr(run, 'usage_metadata') and run.usage_metadata:
                total_input_tokens += run.usage_metadata.get('input_tokens', 0)
                total_output_tokens += run.usage_metadata.get('output_tokens', 0)
                total_cost += run.usage_metadata.get('total_cost', 0)
        
        logger.info(f"Processadas {run_count} runs")
        
        # Calcular dias do período
        period_days = (end_time - start_time).days
        
        return {
            'input_tokens': total_input_tokens,
            'output_tokens': total_output_tokens,
            'total_tokens': total_input_tokens + total_output_tokens,
            'total_cost': total_cost,
            'period_days': period_days,
            'run_count': run_count,
            'start_date': start_time.strftime('%Y-%m-%d'),
            'end_date': end_time.strftime('%Y-%m-%d'),
            'cycle_based': cycle_day is not None
        }
    
    except Exception as e:
        logger.error(f"Erro ao buscar dados: {e}")
        raise Exception(f"Erro ao buscar dados do LangSmith: {str(e)}")

def get_daily_usage_breakdown(project_name, days_back=7, cycle_day=None, custom_date=None):
    """Retorna breakdown diário do usage"""
    client = get_langsmith_client()
    if not client:
        raise Exception("Não foi possível conectar ao LangSmith")
    
    # Se cycle_day for fornecido, usar período baseado no ciclo
    if cycle_day:
        start_time, end_time = calculate_cycle_dates(cycle_day, custom_date)
        period_days = (end_time - start_time).days + 1
    else:
        end_time = datetime.now()
        start_time = end_time - timedelta(days=days_back)
        period_days = days_back
    
    usage_by_day = {}
    
    for i in range(period_days):
        date = start_time + timedelta(days=i)
        if date > end_time:
            break
            
        day_start = date.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = date.replace(hour=23, minute=59, second=59, microsecond=999999)
        
        try:
            runs = list(client.list_runs(
                project_name=project_name,
                start_time=day_start,
                end_time=day_end
            ))
            
            daily_input_tokens = 0
            daily_output_tokens = 0
            daily_cost = 0
            
            for run in runs:
                if hasattr(run, 'usage_metadata') and run.usage_metadata:
                    daily_input_tokens += run.usage_metadata.get('input_tokens', 0)
                    daily_output_tokens += run.usage_metadata.get('output_tokens', 0)
                    daily_cost += run.usage_metadata.get('total_cost', 0)
            
            daily_total = daily_input_tokens + daily_output_tokens
            
            usage_by_day[date.strftime('%Y-%m-%d')] = {
                'date': date.strftime('%Y-%m-%d'),
                'input_tokens': daily_input_tokens,
                'output_tokens': daily_output_tokens,
                'total_tokens': daily_total,
                'cost': daily_cost
            }
            
        except Exception as e:
            logger.error(f"Erro ao processar dia {date}: {e}")
            usage_by_day[date.strftime('%Y-%m-%d')] = {
                'date': date.strftime('%Y-%m-%d'),
                'input_tokens': 0,
                'output_tokens': 0,
                'total_tokens': 0,
                'cost': 0
            }
    
    return usage_by_day

# Rotas da API
@app.route('/api/health')
def health_check():
    """Endpoint de health check"""
    return jsonify({'status': 'healthy', 'timestamp': datetime.now().isoformat()})

@app.route('/api/projects')
def list_projects():
    """Lista projetos disponíveis - apenas para admin"""
    try:
        client = get_langsmith_client()
        if not client:
            return jsonify({'success': False, 'error': 'Erro de conexão com LangSmith'}), 500
        
        # Retornar todos os projetos configurados
        projects = list(set([config['project'] for config in CLIENT_CONFIG.values()]))
        
        return jsonify({
            'success': True,
            'data': projects
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/clients')
def list_clients():
    """Lista clientes configurados - apenas para admin"""
    return jsonify({
        'success': True,
        'data': CLIENT_CONFIG
    })

@app.route('/api/client/<client_id>')
def get_client_config(client_id):
    """Retorna configuração do cliente"""
    if client_id not in CLIENT_CONFIG:
        return jsonify({
            'success': False,
            'error': 'Cliente não encontrado'
        }), 404
    
    return jsonify({
        'success': True,
        'data': CLIENT_CONFIG[client_id]
    })

@app.route('/api/usage/<project_name>')
def get_usage(project_name):
    """Endpoint principal para obter usage de tokens"""
    days = request.args.get('days', 7, type=int)
    cycle_day = request.args.get('cycle_day', type=int)
    custom_date = request.args.get('date')
    
    if not cycle_day and (days < 1 or days > 30):
        return jsonify({
            'success': False,
            'error': 'Período deve ser entre 1 e 30 dias'
        }), 400
    
    try:
        usage_data = get_token_usage(project_name, days, cycle_day, custom_date)
        return jsonify({
            'success': True,
            'data': usage_data,
            'project_name': project_name
        })
    except Exception as e:
        logger.error(f"Erro na rota /api/usage/{project_name}: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/usage/<project_name>/daily')
def get_daily_usage(project_name):
    """Endpoint para obter breakdown diário"""
    days = request.args.get('days', 7, type=int)
    cycle_day = request.args.get('cycle_day', type=int)
    custom_date = request.args.get('date')
    
    if not cycle_day and (days < 1 or days > 30):
        return jsonify({
            'success': False,
            'error': 'Período deve ser entre 1 e 30 dias'
        }), 400
    
    try:
        daily_data = get_daily_usage_breakdown(project_name, days, cycle_day, custom_date)
        
        # Converter para formato de array para o gráfico
        chart_data = list(daily_data.values())
        chart_data.sort(key=lambda x: x['date'])  # Ordenar por data
        
        return jsonify({
            'success': True,
            'data': chart_data,
            'project_name': project_name
        })
    except Exception as e:
        logger.error(f"Erro na rota /api/usage/{project_name}/daily: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/client/<client_id>/usage')
def get_client_usage(client_id):
    """Endpoint para obter usage de um cliente específico"""
    if client_id not in CLIENT_CONFIG:
        return jsonify({
            'success': False,
            'error': 'Cliente não encontrado'
        }), 404
    
    client_config = CLIENT_CONFIG[client_id]
    project_name = client_config['project']
    cycle_day = client_config['cycle_day']
    custom_date = request.args.get('date')
    
    try:
        usage_data = get_token_usage(project_name, cycle_day=cycle_day, custom_date=custom_date)
        return jsonify({
            'success': True,
            'data': usage_data,
            'project_name': project_name,
            'client_name': client_config['name']
        })
    except Exception as e:
        logger.error(f"Erro na rota /api/client/{client_id}/usage: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/client/<client_id>/usage/daily')
def get_client_daily_usage(client_id):
    """Endpoint para obter breakdown diário de um cliente específico"""
    if client_id not in CLIENT_CONFIG:
        return jsonify({
            'success': False,
            'error': 'Cliente não encontrado'
        }), 404
    
    client_config = CLIENT_CONFIG[client_id]
    project_name = client_config['project']
    cycle_day = client_config['cycle_day']
    custom_date = request.args.get('date')
    
    try:
        daily_data = get_daily_usage_breakdown(project_name, cycle_day=cycle_day, custom_date=custom_date)
        
        # Converter para formato de array para o gráfico
        chart_data = list(daily_data.values())
        chart_data.sort(key=lambda x: x['date'])  # Ordenar por data
        
        return jsonify({
            'success': True,
            'data': chart_data,
            'project_name': project_name,
            'client_name': client_config['name']
        })
    except Exception as e:
        logger.error(f"Erro na rota /api/client/{client_id}/usage/daily: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({'success': False, 'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'success': False, 'error': 'Internal server error'}), 500

if __name__ == '__main__':
    # Verificar se as variáveis de ambiente estão configuradas
    if not os.getenv('LANGSMITH_API_KEY'):
        logger.warning("LANGCHAIN_API_KEY não configurada!")
        print("⚠️  ATENÇÃO: Configure a LANGCHAIN_API_KEY no arquivo .env")
    
    print("🚀 Iniciando servidor Flask...")
    print("📊 Dashboard de Token Usage - Backend")
    print("🔗 Health check: http://localhost:5000/api/health")
    print("📋 Projetos (Admin): http://localhost:5000/api/projects")
    print("👥 Clientes: http://localhost:5000/api/clients")
    print("\n📌 URLs para clientes:")
    for client_id, config in CLIENT_CONFIG.items():
        print(f"   {config['name']}: http://localhost:3000/client/{client_id}")
    print("🔧 Admin: http://localhost:3000/admin")
    
    app.run(debug=True, host='0.0.0.0', port=5000)