import React, { createContext, useContext, useState, useCallback, useRef } from "react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  onUndo?: () => void;
}

interface ToastContextType {
  showToast: (message: string, options?: { type?: ToastType; duration?: number; onUndo?: () => void }) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timeouts = useRef<Record<string, NodeJS.Timeout>>({});

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (timeouts.current[id]) {
      clearTimeout(timeouts.current[id]);
      delete timeouts.current[id];
    }
  }, []);

  const showToast = useCallback((message: string, options: { type?: ToastType; duration?: number; onUndo?: () => void } = {}) => {
    const id = Math.random().toString(36).substring(2, 9);
    const duration = options.duration ?? 5000;

    setToasts((prev) => [...prev, { id, message, type: options.type ?? "success", onUndo: options.onUndo, duration }]);

    const timeout = setTimeout(() => {
      removeToast(id);
    }, duration);

    timeouts.current[id] = timeout;
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-[99999] flex flex-col gap-3 w-full max-w-[90%] md:max-w-md pointer-events-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [isUndone, setIsUndone] = useState(false);

  const handleUndo = () => {
    if (toast.onUndo) {
      setIsUndone(true);
      toast.onUndo();
      onDismiss();
    }
  };

  return (
    <div 
      className="pointer-events-auto animate-in fade-in slide-in-from-bottom-4 duration-300 flex items-center justify-between gap-4 px-4 py-3 rounded-2xl bg-brand-surface-solid/80 backdrop-blur-xl border border-brand-hairline shadow-2xl relative overflow-hidden"
      style={{ boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-2 h-2 rounded-full shrink-0 ${
          toast.type === 'success' ? 'bg-brand-accent' : 
          toast.type === 'error' ? 'bg-brand-red' : 'bg-brand-violet'
        }`} />
        <span className="text-[13px] font-semibold text-brand-text truncate">
          {toast.message}
        </span>
      </div>
      
      {toast.onUndo && !isUndone && (
        <button
          type="button"
          onClick={handleUndo}
          className="shrink-0 px-3 py-1.5 rounded-lg bg-brand-accent text-brand-bg text-[11px] font-bold cursor-pointer transition-transform active:scale-95"
        >
          URUNGKAN
        </button>
      )}

      {/* Progress bar timer */}
      <div className="absolute bottom-0 left-0 h-[3px] bg-brand-text/5 w-full">
        <div 
          className={`h-full transition-all linear ${
            toast.type === 'success' ? 'bg-brand-accent' : 
            toast.type === 'error' ? 'bg-brand-red' : 'bg-brand-violet'
          }`}
          style={{ 
            width: '100%',
            animation: `toastProgress ${toast.duration}ms linear forwards`
          }}
        />
      </div>
    </div>
  );
}
