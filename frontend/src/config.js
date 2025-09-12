// frontend/src/config.js
// Configuração da URL base da API

const getApiBaseUrl = () => {
  // Se estiver em produção, usar o domínio atual
  if (process.env.NODE_ENV === 'production') {
    return window.location.origin;
  }
  
  // Em desenvolvimento, usar localhost
  return 'http://localhost:5000';
};

export const API_BASE_URL = getApiBaseUrl();

// Helper para fazer requisições à API
export const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}/api${endpoint}`;
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || `HTTP Error: ${response.status}`);
    }
    
    return data;
  } catch (error) {
    console.error(`API Error for ${endpoint}:`, error);
    throw error;
  }
};