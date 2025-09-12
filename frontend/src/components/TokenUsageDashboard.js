// frontend/src/components/TokenUsageDashboard.js
import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const TokenUsageDashboard = ({ projectName }) => {
  const [usageData, setUsageData] = useState(null);
  const [dailyData, setDailyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState(7);

  useEffect(() => {
    if (projectName) {
      fetchData();
    }
  }, [projectName, period]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        fetchUsageData(),
        fetchDailyData()
      ]);
    } catch (err) {
      setError('Erro ao carregar dados: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsageData = async () => {
    const response = await fetch(`http://localhost:5000/api/usage/${projectName}?days=${period}`);
    const data = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Erro ao buscar dados de usage');
    }
    
    setUsageData(data.data);
  };

  const fetchDailyData = async () => {
    const response = await fetch(`http://localhost:5000/api/usage/${projectName}/daily?days=${period}`);
    const data = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Erro ao buscar dados diários');
    }
    
    setDailyData(data.data);
  };

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (loading) {
    return (
      <div className="dashboard loading">
        <div className="spinner"></div>
        <p>Carregando dados de {projectName}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard error">
        <h2>❌ Erro</h2>
        <p>{error}</p>
        <button onClick={fetchData} className="retry-btn">
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>📈 Dashboard - {projectName}</h2>
        <div className="period-selector">
          <label>Período: </label>
          <select value={period} onChange={(e) => setPeriod(Number(e.target.value))}>
            <option value={1}>1 dia</option>
            <option value={7}>7 dias</option>
            <option value={15}>15 dias</option>
            <option value={30}>30 dias</option>
          </select>
        </div>
      </div>

      {usageData && (
        <div className="metrics-grid">
          <div className="metric-card total-tokens">
            <div className="metric-icon">🎯</div>
            <div className="metric-content">
              <h3>Tokens Totais</h3>
              <p className="metric-value">{formatNumber(usageData.total_tokens)}</p>
              <small>{usageData.period_days} dias • {usageData.run_count} execuções</small>
            </div>
          </div>
          
          <div className="metric-card input-tokens">
            <div className="metric-icon">📥</div>
            <div className="metric-content">
              <h3>Tokens de Entrada</h3>
              <p className="metric-value">{formatNumber(usageData.input_tokens)}</p>
              <small>{((usageData.input_tokens / usageData.total_tokens) * 100).toFixed(1)}% do total</small>
            </div>
          </div>
          
          <div className="metric-card output-tokens">
            <div className="metric-icon">📤</div>
            <div className="metric-content">
              <h3>Tokens de Saída</h3>
              <p className="metric-value">{formatNumber(usageData.output_tokens)}</p>
              <small>{((usageData.output_tokens / usageData.total_tokens) * 100).toFixed(1)}% do total</small>
            </div>
          </div>
          
          <div className="metric-card cost">
            <div className="metric-icon">💰</div>
            <div className="metric-content">
              <h3>Custo Total</h3>
              <p className="metric-value">{formatCurrency(usageData.total_cost)}</p>
              <small>Últimos {usageData.period_days} dias</small>
            </div>
          </div>
        </div>
      )}

      {dailyData && dailyData.length > 0 && (
        <div className="charts-container">
          <div className="chart-section">
            <h3>📊 Uso Diário de Tokens</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date) => {const d = new Date(date + "T00:00:00");
                    return d.toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' });
                  }}
                />
                <YAxis tickFormatter={formatNumber} />
                <Tooltip 
                  labelFormatter={(date) => new Date(date).toLocaleDateString('pt-BR')}
                  formatter={(value, name) => [formatNumber(value), name]}
                />
                <Line 
                  type="monotone" 
                  dataKey="total_tokens" 
                  stroke="#8884d8" 
                  strokeWidth={2}
                  name="Total de Tokens"
                />
                <Line 
                  type="monotone" 
                  dataKey="input_tokens" 
                  stroke="#82ca9d" 
                  strokeWidth={2}
                  name="Tokens de Entrada"
                />
                <Line 
                  type="monotone" 
                  dataKey="output_tokens" 
                  stroke="#ffc658" 
                  strokeWidth={2}
                  name="Tokens de Saída"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-section">
            <h3>💵 Custo Diário</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date"
                  tickFormatter={(date) => {const d = new Date(date + "T00:00:00");
                    return d.toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' });
                  }}
                />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip 
                  labelFormatter={(date) => new Date(date).toLocaleDateString('pt-BR')}
                  formatter={(value) => [formatCurrency(value), 'Custo']}
                />
                <Bar dataKey="cost" fill="#ff7300" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="refresh-section">
        <button onClick={fetchData} className="refresh-btn">
          🔄 Atualizar Dados
        </button>
        <small>Última atualização: {new Date().toLocaleTimeString('pt-BR')}</small>
      </div>
    </div>
  );
};

export default TokenUsageDashboard;