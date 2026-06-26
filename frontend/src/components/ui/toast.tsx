import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { cn } from "@/utils/cn";
import { X } from "lucide-react";

export type ToastVariant = "default" | "destructive" | "success";

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
}

interface ToastContextType {
  toast: (options: Omit<ToastMessage, "id">) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const toast = ({ title, description, variant = "default" }: Omit<ToastMessage, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, description, variant }]);
  };

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      {/* Toast Viewport at bottom right of the screen */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex items-start justify-between gap-3 p-4 rounded-xl border shadow-lg transition-all duration-300 transform translate-y-0 animate-in fade-in slide-in-from-bottom-5",
              t.variant === "destructive"
                ? "bg-destructive border-destructive text-destructive-foreground"
                : t.variant === "success"
                ? "bg-emerald-600 border-emerald-700 text-white"
                : "bg-card border-border text-card-foreground"
            )}
          >
            <div className="flex flex-col gap-1">
              <h4 className="font-semibold text-sm leading-none">{t.title}</h4>
              {t.description && <p className="text-xs opacity-90">{t.description}</p>}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="text-current opacity-70 hover:opacity-100 transition-opacity p-0.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>
            {/* Self-destruct logic */}
            <ToastAutoDismiss id={t.id} dismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const ToastAutoDismiss: React.FC<{ id: string; dismiss: (id: string) => void }> = ({ id, dismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      dismiss(id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [id, dismiss]);
  return null;
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
