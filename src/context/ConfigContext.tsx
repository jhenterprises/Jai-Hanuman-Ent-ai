import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface ConfigContextType {
  config: any;
  refreshConfig: () => Promise<void>;
  loading: boolean;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = async () => {
    try {
      const docRef = doc(db, 'settings', 'portal');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setConfig(docSnap.data());
      } else {
        // Default config if not found
        setConfig({ 
          portal_name: 'JH Digital Seva Kendra',
          theme_color: '#3b82f6',
          secondary_color: '#64748b',
          header_bg_color: '#1e293b'
        });
      }
      setError(null);
    } catch (err: any) {
      console.error('Error fetching config:', err);
      // For other errors, use defaults to keep the app running
      setConfig({ 
        portal_name: 'JH Digital Seva Kendra',
        theme_color: '#3b82f6',
        secondary_color: '#64748b',
        header_bg_color: '#1e293b'
      });
      setError(null);
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

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg border border-red-200">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Setup Required</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
            <p className="text-sm text-yellow-800 font-bold">Common Mistake:</p>
            <p className="text-sm text-yellow-800">Do not paste your Web API Key (which is ~40 characters long and starts with AIzaSy). You must download a JSON file and copy the massive block of text that starts with "-----BEGIN PRIVATE KEY-----".</p>
          </div>
          <div className="bg-gray-100 p-4 rounded text-sm font-mono text-gray-800 overflow-x-auto whitespace-pre-wrap break-all">
            1. Go to Firebase Console<br/>
            2. Open Project Settings &gt; Service Accounts<br/>
            3. Click "Generate new private key" (downloads a JSON file)<br/>
            4. Open the JSON file in a text editor<br/>
            5. Copy the ENTIRE private_key string (including BEGIN/END lines)<br/>
            6. Paste into AI Studio Settings &gt; FIREBASE_PRIVATE_KEY
          </div>
        </div>
      </div>
    );
  }

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
