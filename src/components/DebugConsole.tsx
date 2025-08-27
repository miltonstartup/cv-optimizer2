import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useDebug, DebugLog } from '../contexts/DebugContext';
import { X, Search, Filter, Download, Trash2, ChevronDown, ChevronRight, Bug } from 'lucide-react';

const DebugConsole: React.FC = () => {
  const { logs, isConsoleOpen, toggleConsole, clearLogs } = useDebug();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const consoleRef = useRef<HTMLDivElement>(null);

  // Filtrar logs basado en criterios
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = searchTerm === '' || 
        log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.component && log.component.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesLevel = selectedLevel === 'all' || log.level === selectedLevel;
      const matchesCategory = selectedCategory === 'all' || log.category === selectedCategory;
      
      return matchesSearch && matchesLevel && matchesCategory;
    });
  }, [logs, searchTerm, selectedLevel, selectedCategory]);

  // Obtener categorías únicas
  const categories = useMemo(() => {
    const cats = new Set(logs.map(log => log.category));
    return Array.from(cats);
  }, [logs]);

  // Expandir/colapsar log
  const toggleLogExpansion = (logId: string) => {
    setExpandedLogs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  };

  // Exportar logs
  const exportLogs = () => {
    const logData = JSON.stringify(filteredLogs, null, 2);
    const blob = new Blob([logData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cv-optimizer-debug-logs-${new Date().toISOString().slice(0, 19)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Auto-scroll hacia abajo cuando hay nuevos logs
  useEffect(() => {
    if (consoleRef.current && isConsoleOpen) {
      const scrollTop = consoleRef.current.scrollTop;
      const scrollHeight = consoleRef.current.scrollHeight;
      const clientHeight = consoleRef.current.clientHeight;
      
      // Solo auto-scroll si ya estamos cerca del bottom
      if (scrollHeight - scrollTop - clientHeight < 100) {
        consoleRef.current.scrollTop = scrollHeight;
      }
    }
  }, [logs, isConsoleOpen]);

  // Función para obtener color del nivel
  const getLevelColor = (level: DebugLog['level']) => {
    switch (level) {
      case 'error': return 'text-red-500 bg-red-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      case 'info': return 'text-blue-500 bg-blue-50';
      case 'api': return 'text-purple-500 bg-purple-50';
      case 'ai': return 'text-green-500 bg-green-50';
      case 'success': return 'text-emerald-500 bg-emerald-50';
      default: return 'text-gray-500 bg-gray-50';
    }
  };

  // Función para obtener icono del nivel
  const getLevelIcon = (level: DebugLog['level']) => {
    switch (level) {
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      case 'api': return '🔗';
      case 'ai': return '🤖';
      case 'success': return '✅';
      default: return '📝';
    }
  };

  if (!isConsoleOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl h-3/4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50 rounded-t-lg">
          <div className="flex items-center gap-3">
            <Bug className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-800">
              Consola de Debugging CV Optimizer
            </h3>
            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-sm font-medium">
              {filteredLogs.length} logs
            </span>
          </div>
          <button
            onClick={toggleConsole}
            className="text-gray-400 hover:text-gray-600 p-1"
            title="Cerrar consola"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controls */}
        <div className="p-4 border-b bg-gray-50 space-y-3">
          {/* Search and Filters */}
          <div className="flex flex-wrap gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar en logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            {/* Level Filter */}
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todos los niveles</option>
              <option value="error">❌ Error</option>
              <option value="warning">⚠️ Warning</option>
              <option value="info">ℹ️ Info</option>
              <option value="api">🔗 API</option>
              <option value="ai">🤖 AI</option>
              <option value="success">✅ Success</option>
            </select>
            
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todas las categorías</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={exportLogs}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              title="Exportar logs"
            >
              <Download className="w-4 h-4" />
              Exportar
            </button>
            <button
              onClick={clearLogs}
              className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              title="Limpiar logs"
            >
              <Trash2 className="w-4 h-4" />
              Limpiar
            </button>
          </div>
        </div>

        {/* Logs Container */}
        <div ref={consoleRef} className="flex-1 p-4 overflow-y-auto bg-gray-900 text-green-400 font-mono text-sm">
          {filteredLogs.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <Bug className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No hay logs que mostrar</p>
              {searchTerm && <p className="mt-2">Intenta cambiar los filtros de búsqueda</p>}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredLogs.map((log) => {
                const isExpanded = expandedLogs.has(log.id);
                return (
                  <div key={log.id} className="border border-gray-700 rounded-lg overflow-hidden">
                    {/* Log Header */}
                    <div
                      className="flex items-start gap-3 p-3 bg-gray-800 cursor-pointer hover:bg-gray-750"
                      onClick={() => toggleLogExpansion(log.id)}
                    >
                      <div className="flex-shrink-0">
                        {isExpanded ? 
                          <ChevronDown className="w-4 h-4 text-gray-400 mt-1" /> :
                          <ChevronRight className="w-4 h-4 text-gray-400 mt-1" />
                        }
                      </div>
                      
                      <div className="flex-shrink-0 text-lg">
                        {getLevelIcon(log.level)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getLevelColor(log.level)}`}>
                            {log.level.toUpperCase()}
                          </span>
                          <span className="text-blue-400 text-xs">
                            [{log.category}]
                          </span>
                          {log.component && (
                            <span className="text-yellow-400 text-xs">
                              {log.component}
                            </span>
                          )}
                          <span className="text-gray-500 text-xs ml-auto">
                            {log.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="text-white break-words">
                          {log.message}
                        </div>
                      </div>
                    </div>
                    
                    {/* Log Details */}
                    {isExpanded && log.data && (
                      <div className="p-4 bg-gray-850 border-t border-gray-700">
                        <div className="text-gray-400 text-xs mb-2">DATOS ADICIONALES:</div>
                        <pre className="text-green-300 text-xs overflow-x-auto whitespace-pre-wrap">
                          {typeof log.data === 'string' ? log.data : JSON.stringify(log.data, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DebugConsole;