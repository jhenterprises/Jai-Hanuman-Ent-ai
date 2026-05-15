import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { toast } from 'react-hot-toast';

export interface ServiceControl {
  id: string;
  serviceKey: string;
  serviceName: string;
  isLive: boolean;
  maintenanceMode: boolean;
  comingSoon: boolean;
  bannerMessage: string;
  icon?: string;
  order: number;
  apiStatus: 'connected' | 'disconnected' | 'maintenance';
  lastChecked?: string;
  provider?: string;
  updatedAt: string;
}

interface ServiceControlContextType {
  services: ServiceControl[];
  loading: boolean;
  getServiceStatus: (key: string) => ServiceControl | undefined;
}

const ServiceControlContext = createContext<ServiceControlContextType | undefined>(undefined);

export const ServiceControlProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [services, setServices] = useState<ServiceControl[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'service_controls'), orderBy('order', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const servicesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ServiceControl[];
      
      setServices(servicesData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching service controls:', error);
      toast.error('Failed to sync service availability');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getServiceStatus = (key: string) => {
    return services.find(s => s.serviceKey === key);
  };

  return (
    <ServiceControlContext.Provider value={{ services, loading, getServiceStatus }}>
      {children}
    </ServiceControlContext.Provider>
  );
};

export const useServiceControl = () => {
  const context = useContext(ServiceControlContext);
  if (context === undefined) {
    throw new Error('useServiceControl must be used within a ServiceControlProvider');
  }
  return context;
};
