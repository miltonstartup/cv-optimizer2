import React from 'react';
import { useDebug } from '../contexts/DebugContext';
import { Bug } from 'lucide-react';

const DebugButton: React.FC = () => {
  const { toggleConsole, logs } = useDebug();
  
  // Contar logs por nivel para mostrar indicadores
  const errorCount = logs.filter(log => log.level === 'error').length;
  const hasNewLogs = logs.length > 0;
  
  return (
    <button
      onClick={toggleConsole}
      className={`fixed bottom-4 right-4 z-40 p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110 ${
        errorCount > 0 
          ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse' 
          : hasNewLogs 
          ? 'bg-blue-600 hover:bg-blue-700 text-white' 
          : 'bg-gray-600 hover:bg-gray-700 text-white'
      }`}
      title="Abrir consola de debugging"
    >
      <div className="relative">
        <Bug className="w-6 h-6" />
        
        {/* Indicador de errores */}
        {errorCount > 0 && (
          <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
            {errorCount > 99 ? '99+' : errorCount}
          </div>
        )}
        
        {/* Indicador de nuevos logs */}
        {hasNewLogs && errorCount === 0 && (
          <div className="absolute -top-1 -right-1 bg-green-500 rounded-full w-3 h-3"></div>
        )}
      </div>
    </button>
  );
};

export default DebugButton;