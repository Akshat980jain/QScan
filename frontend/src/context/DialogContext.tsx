import React, { createContext, useContext, useState, useRef } from 'react';
import { AlertTriangle, CheckCircle, Info, HelpCircle } from 'lucide-react';

interface DialogOptions {
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
}

interface DialogContextType {
  alert: (title: string, message: string) => Promise<void>;
  confirm: (title: string, message: string, options?: DialogOptions) => Promise<boolean>;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<'alert' | 'confirm'>('alert');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [confirmText, setConfirmText] = useState('OK');
  const [cancelText, setCancelText] = useState('Cancel');
  const [isDanger, setIsDanger] = useState(false);
  
  const resolverRef = useRef<(value: boolean) => void>(() => {});

  const alert = (title: string, message: string): Promise<void> => {
    setTitle(title);
    setMessage(message);
    setType('alert');
    setConfirmText('OK');
    setIsDanger(false);
    setIsOpen(true);
    return new Promise<void>((resolve) => {
      resolverRef.current = () => {
        resolve();
      };
    });
  };

  const confirm = (title: string, message: string, options?: DialogOptions): Promise<boolean> => {
    setTitle(title);
    setMessage(message);
    setType('confirm');
    setConfirmText(options?.confirmText || 'Confirm');
    setCancelText(options?.cancelText || 'Cancel');
    setIsDanger(options?.isDanger || false);
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = (value: boolean) => {
        resolve(value);
      };
    });
  };

  const handleClose = (value: boolean) => {
    setIsOpen(false);
    if (resolverRef.current) {
      resolverRef.current(value);
    }
  };

  // Get matching icon based on danger and type
  const getIcon = () => {
    if (isDanger) {
      return <AlertTriangle className="w-8 h-8 text-red-500 dark:text-red-400" />;
    }
    if (type === 'confirm') {
      return <HelpCircle className="w-8 h-8 text-orange-500 dark:text-orange-500" />;
    }
    if (title.toLowerCase().includes('success') || message.toLowerCase().includes('success') || message.toLowerCase().includes('copi')) {
      return <CheckCircle className="w-8 h-8 text-green-500 dark:text-green-400" />;
    }
    return <Info className="w-8 h-8 text-orange-500 dark:text-orange-500" />;
  };

  return (
    <DialogContext.Provider value={{ alert, confirm }}>
      {children}

      {/* Modal Dialog Portal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fadeIn">
          <div className="bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden p-6 relative animate-slideUp text-zinc-800 dark:text-zinc-100 flex flex-col items-center text-center">
            
            {/* Icon Banner */}
            <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-950 border dark:border-zinc-800 rounded-full flex items-center justify-center shadow-inner mb-4">
              {getIcon()}
            </div>

            {/* Title */}
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-2">{title}</h3>
            
            {/* Description */}
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">{message}</p>
            
            {/* Buttons Row */}
            <div className="flex space-x-3 w-full justify-center">
              {type === 'confirm' && (
                <button
                  onClick={() => handleClose(false)}
                  className="flex-1 max-w-[140px] py-2.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl transition-all font-semibold text-sm text-zinc-650 dark:text-zinc-300"
                >
                  {cancelText}
                </button>
              )}
              <button
                onClick={() => handleClose(true)}
                className={`flex-1 max-w-[140px] py-2.5 text-white rounded-xl font-semibold text-sm transition-all shadow-md ${
                  isDanger 
                    ? 'bg-red-600 hover:bg-red-700 active:bg-red-800 shadow-red-500/10' 
                    : 'bg-orange-600 hover:bg-orange-700 active:bg-orange-850 shadow-orange-500/10'
                }`}
              >
                {confirmText}
              </button>
            </div>

          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const context = useContext(DialogContext);
  if (context === undefined) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
}
