export interface DebugLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success';
  category: string;
  message: string;
  data?: any;
}

export class DebugLogger {
  private static instance: DebugLogger;
  private logs: DebugLog[] = [];
  private listeners: Array<(logs: DebugLog[]) => void> = [];
  private maxLogs = 1000;

  private constructor() {
    // Enable console capture
    this.captureConsole();
  }

  static getInstance(): DebugLogger {
    if (!DebugLogger.instance) {
      DebugLogger.instance = new DebugLogger();
    }
    return DebugLogger.instance;
  }

  private captureConsole() {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args: any[]) => {
      originalLog.apply(console, args);
      this.log('info', 'Console', args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' '));
    };

    console.error = (...args: any[]) => {
      originalError.apply(console, args);
      this.log('error', 'Console', args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' '));
    };

    console.warn = (...args: any[]) => {
      originalWarn.apply(console, args);
      this.log('warning', 'Console', args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' '));
    };
  }

  log(level: DebugLog['level'], category: string, message: string, data?: any) {
    const logEntry: DebugLog = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data: data ? (typeof data === 'object' ? JSON.parse(JSON.stringify(data)) : data) : undefined
    };

    this.logs.unshift(logEntry);
    
    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // Notify listeners
    this.listeners.forEach(listener => listener([...this.logs]));
  }

  info(category: string, message: string, data?: any) {
    this.log('info', category, message, data);
  }

  success(category: string, message: string, data?: any) {
    this.log('success', category, message, data);
  }

  warning(category: string, message: string, data?: any) {
    this.log('warning', category, message, data);
  }

  error(category: string, message: string, data?: any) {
    this.log('error', category, message, data);
  }

  subscribe(listener: (logs: DebugLog[]) => void) {
    this.listeners.push(listener);
    // Send current logs immediately
    listener([...this.logs]);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  getLogs(): DebugLog[] {
    return [...this.logs];
  }

  clear() {
    this.logs = [];
    this.listeners.forEach(listener => listener([]));
  }

  downloadLogs() {
    const logsText = this.logs.map(log => 
      `[${log.timestamp}] ${log.level.toUpperCase()} [${log.category}] ${log.message}${log.data ? '\n' + JSON.stringify(log.data, null, 2) : ''}`
    ).join('\n\n');
    
    const blob = new Blob([logsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cv-optimizer-debug-${new Date().toISOString().split('T')[0]}.log`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// Global debug logger instance
export const debugLogger = DebugLogger.getInstance();