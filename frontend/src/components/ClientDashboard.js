// frontend/src/components/ClientDashboard.js
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ClientTokenUsageDashboard from './ClientTokenUsageDashboard';
import { apiRequest } from '../config';

const ClientDashboard = () => {
  const { clientId } = useParams();
  const [clientConfig, setClientConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchClientConfig();
  }, [clientId]);

  const fetchClientConfig = async () => {
    try {
      const data = await apiRequest(`/client/${clientId}`);
      
      if (data.success) {
        setClientConfig(data.data);
      } else {
        setError('Cliente não encontrado ou erro na configuração');
      }
    } catch (err) {
      setError('Erro de conexão com o servidor: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getCycleDateInfo = () => {
    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const cycleDay = clientConfig.cycle_day;

    let nextCycleDate;
    
    if (currentDay < cycleDay) {
      // Próximo ciclo é neste mês
      nextCycleDate = new Date(currentYear, currentMonth, cycleDay);
    } else {
      // Próximo ciclo é no próximo mês
      nextCycleDate = new Date(currentYear, currentMonth + 1, cycleDay);
    }

    const daysUntilReset = Math.ceil((nextCycleDate - now) / (1000 * 60 * 60 * 24));
    
    return {
      nextCycleDate: nextCycleDate.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric' 
      }),
      daysUntilReset
    };
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Carregando seu dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error">
        <h2>❌ Oops!</h2>
        <p>Não conseguimos carregar seus dados.</p>
        <p className="error-details">{error}</p>
        <button onClick={() => window.location.reload()}>
          🔄 Tentar Novamente
        </button>
      </div>
    );
  }

  const cycleInfo = getCycleDateInfo();

  return (
    <>
      <header className="app-header client-header">
        <div className="client-header-content">
          <h1>📊 {clientConfig.name}</h1>
          <p className="client-subtitle">Dashboard de Consumo de Tokens</p>
        </div>
        <div className="client-info">
          <div className="cycle-info">
            <span className="cycle-current">
              📅 Período atual até dia {clientConfig.cycle_day}
            </span>
            <small className="cycle-next">
              Próxima renovação: {cycleInfo.nextCycleDate} 
              ({cycleInfo.daysUntilReset} {cycleInfo.daysUntilReset === 1 ? 'dia' : 'dias'})
            </small>
          </div>
        </div>
      </header>

      <main className="app-main">
        <ClientTokenUsageDashboard 
          clientId={clientId}
          clientConfig={clientConfig}
        />
      </main>
    </>
  );
};

export default ClientDashboard;