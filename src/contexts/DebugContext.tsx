import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

export interface DebugLog {
  id: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'api' | 'ai' | 'success';
  category: string;
  message: string;
  data?: any;
  component?: string;
}

interface DebugContextType {
  logs: DebugLog[];
  isConsoleOpen: boolean;
  addLog: (log: Omit<DebugLog, 'id' | 'timestamp'>) => void;
  clearLogs: () => void;
  toggleConsole: () => void;
  filterLogs: (level?: string, category?: string) => DebugLog[];
}

const DebugContext = createContext<DebugContextType | undefined>(undefined);

export function DebugProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);

  const addLog = useCallback((logData: Omit<DebugLog, 'id' | 'timestamp'>) => {
    const newLog: DebugLog = {
      ...logData,
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };
    
    setLogs(prevLogs => {
      // Mantener solo los últimos 500 logs para performance
      const updatedLogs = [newLog, ...prevLogs].slice(0, 500);
      return updatedLogs;
    });
    
    // También loggear en consola del navegador para debugging
    const consoleMethod = logData.level === 'error' ? 'error' : 
                         logData.level === 'warning' ? 'warn' : 'log';
    console[consoleMethod](`🐛 [${logData.category}] ${logData.message}`, logData.data || '');
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const toggleConsole = useCallback(() => {
    setIsConsoleOpen(prev => !prev);
  }, []);

  const filterLogs = useCallback((level?: string, category?: string) => {
    return logs.filter(log => {
      if (level && log.level !== level) return false;
      if (category && log.category !== category) return false;
      return true;
    });
  }, [logs]);

  return (
    <DebugContext.Provider value={{
      logs,
      isConsoleOpen,
      addLog,
      clearLogs,
      toggleConsole,
      filterLogs
    }}>
      {children}
    </DebugContext.Provider>
  );
}

export function useDebug() {
  const context = useContext(DebugContext);
  if (context === undefined) {
    throw new Error('useDebug must be used within a DebugProvider');
  }
  return context;
}

// Hook para logging fácil
export function useLogger(componentName: string) {
  const { addLog } = useDebug();
  
  return {
    info: (message: string, data?: any) => addLog({ level: 'info', category: 'Component', message, data, component: componentName }),
    warning: (message: string, data?: any) => addLog({ level: 'warning', category: 'Component', message, data, component: componentName }),
    error: (message: string, data?: any) => addLog({ level: 'error', category: 'Component', message, data, component: componentName }),
    api: (message: string, data?: any) => addLog({ level: 'api', category: 'API', message, data, component: componentName }),
    ai: (message: string, data?: any) => addLog({ level: 'ai', category: 'AI', message, data, component: componentName }),
    success: (message: string, data?: any) => addLog({ level: 'success', category: 'Success', message, data, component: componentName })
  };
}