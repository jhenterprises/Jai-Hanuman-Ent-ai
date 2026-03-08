import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

interface ConfigContextType {
  config: any;
  refreshConfig: () => Promise<void>;
  loading: boolean;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<any>({});
  const [loading, setLoading] = useState(true);

  const fetchConfig = async () => {
    try {
      const res = await api.get('/portal-config');
      setConfig(res.data || {});
    } catch (err) {
      console.error('Error fetching config:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  useEffect(() => {
    if (config && Object.keys(config).length > 0) {
      // Apply dynamic theme colors
      const root = document.documentElement;
      if (config.theme_color) root.style.setProperty('--color-primary', config.theme_color);
      if (config.secondary_color) root.style.setProperty('--color-secondary', config.secondary_color);
      if (config.header_bg_color) root.style.setProperty('--color-header-bg', config.header_bg_color);
      
      // Update document title
      if (config.portal_name) {
        document.title = config.portal_name;
      }
    }
  }, [config]);

  return (
    <ConfigContext.Provider value={{ config, refreshConfig: fetchConfig, loading }}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (context === undefined) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
};
