// frontend/src/components/AdminDashboard.js
import React, { useState, useEffect } from 'react';
import TokenUsageDashboard from './TokenUsageDashboard';
import { apiRequest } from '../config';

const AdminDashboard = () => {
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState({});
  const [selectedProject, setSelectedProject] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showClientUrls, setShowClientUrls] = useState(false);
  const [copySuccess, setCopySuccess] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [projectsData, clientsData] = await Promise.all([
        apiRequest('/projects'),
        apiRequest('/clients')
      ]);
      
      if (projectsData.success) {
        setProjects(projectsData.data);
        if (projectsData.data.length > 0) {
          setSelectedProject(projectsData.data[0]);
        }
      } else {
        setError('Erro ao carregar projetos: ' + projectsData.error);
      }

      if (clientsData.success) {
        setClients(clientsData.data);
      }
    } catch (err) {
      setError('Erro de conexão com o backend: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text, clientName) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(`URL copiada: ${clientName}`);
      setTimeout(() => setCopySuccess(''), 3000);
    } catch (err) {
      // Fallback para navegadores mais antigos
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess(`URL copiada: ${clientName}`);
      setTimeout(() => setCopySuccess(''), 3000);
    }
  };

  const getClientUrl = (clientId) => {
    return `${window.location.origin}/client/${clientId}`;
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Carregando projetos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error">
        <h2>❌ Erro</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <>
      <header className="app-header">
        <h1>🔧 Dashboard Admin - Token Usage</h1>
        <div className="admin-controls">
          <div className="project-selector">
            <label>Projeto: </label>
            <select 
              value={selectedProject} 
              onChange={(e) => setSelectedProject(e.target.value)}
            >
              {projects.map(project => (
                <option key={project} value={project}>
                  {project}
                </option>
              ))}
            </select>
          </div>
          <button 
            className="client-urls-btn"
            onClick={() => setShowClientUrls(!showClientUrls)}
          >
            {showClientUrls ? '🔗 Ocultar URLs' : '🔗 Mostrar URLs dos Clientes'}
          </button>
        </div>
      </header>

      {copySuccess && (
        <div className="copy-success-message">
          ✅ {copySuccess}
        </div>
      )}

      {showClientUrls && (
        <div className="client-urls-section">
          <h3>🔗 URLs dos Clientes</h3>
          <p className="urls-description">
            Compartilhe estas URLs com os clientes. Cada URL mostra apenas os dados específicos do cliente.
          </p>
          
          <div className="client-urls-grid">
            {Object.entries(clients).map(([clientId, config]) => (
              <div key={clientId} className="client-url-card">
                <div className="client-info">
                  <h4>{config.name}</h4>
                  <div className="client-details">
                    <span className="detail-item">
                      📊 Projeto: <strong>{config.project}</strong>
                    </span>
                    <span className="detail-item">
                      📅 Ciclo: <strong>Dia {config.cycle_day}</strong>
                    </span>
                  </div>
                </div>
                <div className="client-url">
                  <input 
                    type="text" 
                    value={getClientUrl(clientId)}
                    readOnly
                    onClick={(e) => e.target.select()}
                  />
                  <button 
                    onClick={() => copyToClipboard(getClientUrl(clientId), config.name)}
                    className="copy-btn"
                    title={`Copiar URL do ${config.name}`}
                  >
                    📋 Copiar
                  </button>
                  <a 
                    href={getClientUrl(clientId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="preview-btn"
                    title={`Visualizar dashboard do ${config.name}`}
                  >
                    👁️ Ver
                  </a>
                </div>
              </div>
            ))}
          </div>
          
          <div className="urls-help">
            <h4>💡 Como usar:</h4>
            <ul>
              <li><strong>Copiar URL:</strong> Clique em "📋 Copiar" e compartilhe com o cliente</li>
              <li><strong>Visualizar:</strong> Clique em "👁️ Ver" para testar como o cliente verá</li>
              <li><strong>Período:</strong> Cada cliente vê apenas o consumo do período atual baseado no dia do ciclo</li>
            </ul>
          </div>
        </div>
      )}

      <main className="app-main">
        {selectedProject && (
          <TokenUsageDashboard 
            projectName={selectedProject} 
            isAdmin={true}
          />
        )}
      </main>
    </>
  );
};

export default AdminDashboard;