// frontend/src/App.js
import React, { useState, useEffect } from 'react';
import TokenUsageDashboard from './components/TokenUsageDashboard';
import './App.css';

function App() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/projects');
      const data = await response.json();
      
      if (data.success) {
        setProjects(data.data);
        if (data.data.length > 0) {
          setSelectedProject(data.data[0]);
        }
      } else {
        setError('Erro ao carregar projetos: ' + data.error);
      }
    } catch (err) {
      setError('Erro de conexão com o backend: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="app">
        <div className="loading">
          <div className="spinner"></div>
          <p>Carregando projetos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <div className="error">
          <h2>❌ Erro</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>📊 Controle de Consumo </h1>
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
      </header>

      <main className="app-main">
        {selectedProject && <TokenUsageDashboard projectName={selectedProject} />}
      </main>
    </div>
  );
}

export default App;