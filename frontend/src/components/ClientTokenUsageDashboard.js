// frontend/src/components/ClientTokenUsageDashboard.js
import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const ClientTokenUsageDashboard = ({ clientId, clientConfig }) => {
  const [usageData, setUsageData] = useState(null);
  const [dailyData, setDailyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (clientId) {
      fetchData();
    }
  }, [clientId]);

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
    const response = await fetch(`http://localhost:5000/api/client/${clientId}/usage`);
    const data = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Erro ao buscar dados de usage');
    }
    
    setUsageData(data.data);
  };

  const fetchDailyData = async () => {
    const response = await fetch(`http://localhost:5000/api/client/${clientId}/usage/daily`);
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
      currency: 'USD'
    }).format(value);
  };

  const formatDateRange = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const options = { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    };
    
    return `${start.toLocaleDateString('pt-BR', options)} - ${end.toLocaleDateString('pt-BR', options)}`;
  };

  if (loading) {
    return (
      <div className="dashboard loading">
        <div className="spinner"></div>
        <p>Carregando seus dados...</p>
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
      <div className="dashboard-header client-dashboard-header">
        <h2>📈 Consumo do Período Atual</h2>
        {usageData && (
          <div className="period-info">
            <span className="period-label">
              📅 {formatDateRange(usageData.start_date, usageData.end_date)}
            </span>
            <small>
              {usageData.period_days} dias • Próxima renovação: dia {clientConfig.cycle_day}
            </small>
          </div>
        )}
      </div>

      {usageData && (
        <div className="metrics-grid">
          <div className="metric-card total-tokens">
            <div className="metric-icon">🎯</div>
            <div className="metric-content">
              <h3>Tokens Totais</h3>
              <p className="metric-value">{formatNumber(usageData.total_tokens)}</p>
              <small>Período atual • {usageData.run_count} execuções</small>
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
              <small>Período atual</small>
            </div>
          </div>
        </div>
      )}

      {dailyData && dailyData.length > 0 && (
        <div className="charts-container">
          <div className="chart-section">
            <h3>📊 Uso Diário de Tokens no Período</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date) => new Date(date).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' })}
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
            <h3>💵 Custo Diário no Período</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date"
                  tickFormatter={(date) => new Date(date).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' })}
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

export default ClientTokenUsageDashboard;