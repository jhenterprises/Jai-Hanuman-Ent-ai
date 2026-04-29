import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot, enableNetwork } from 'firebase/firestore';
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

  useEffect(() => {
    let isMounted = true;
    const docRef = doc(db, 'settings', 'portal');
    
    console.log('Starting config listener...');
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (!isMounted) return;
      
      if (docSnap.exists()) {
        console.log('Config received via snapshot');
        setConfig(docSnap.data());
      } else {
        console.log('Config document does not exist, using defaults');
        setConfig({ 
          portal_name: 'JH Digital Seva Kendra',
          theme_color: '#3b82f6',
          secondary_color: '#64748b',
          header_bg_color: '#1e293b',
          logo_url: 'https://firebasestorage.googleapis.com/v0/b/ais-dev-nkao4wgl3qoklcmykae3vf.appspot.com/o/artifacts%2Finput_file_1.png?alt=media'
        });
      }
      setLoading(false);
      setError(null);
    }, (err) => {
      if (!isMounted) return;
      console.error('Config listener error:', err);
      
      // If it's a permission error, we should show it
      if (err.message?.includes('permission')) {
        setError('Configuration permission error: Please check Firestore Rules.');
      }
      
      // If offline, we just use defaults and stay in loading or silent
      if (err.message?.includes('offline') || err.code === 'unavailable') {
        console.warn('Config listener is offline, using defaults');
        setConfig({ 
          portal_name: 'JH Digital Seva Kendra (Offline Mode)',
          theme_color: '#3b82f6',
          secondary_color: '#64748b',
          header_bg_color: '#1e293b',
          logo_url: 'https://firebasestorage.googleapis.com/v0/b/ais-dev-nkao4wgl3qoklcmykae3vf.appspot.com/o/artifacts%2Finput_file_1.png?alt=media'
        });
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const refreshConfig = async () => {
    // onSnapshot handles refreshes automatically, but we can poke it if needed
    setLoading(true);
    setTimeout(() => setLoading(false), 500);
  };

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
          <h2 className="text-2xl font-bold text-red-600 mb-4">Connection Error</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
            <p className="text-sm text-yellow-800 font-bold">Troubleshooting:</p>
            <ul className="text-sm text-yellow-800 list-disc ml-4 mt-2">
              <li>Check your internet connection.</li>
              <li>Wait 30 seconds and refresh the page.</li>
              <li>Ensure your Firebase project is correctly configured in the settings.</li>
            </ul>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 text-white font-bold py-2 rounded hover:bg-blue-700 transition"
          >
            Retry Now
          </button>
        </div>
      </div>
    );
  }

  return (
    <ConfigContext.Provider value={{ config, refreshConfig: async () => {}, loading }}>
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
