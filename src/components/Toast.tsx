import { useEffect } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

export function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-3 right-3 sm:top-4 sm:right-4 z-50 animate-slide-in max-w-[calc(100vw-1.5rem)]">
      <div
        className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg shadow-lg ${
          type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white min-w-[200px] sm:min-w-[300px] max-w-[calc(100vw-1.5rem)]`}
      >
        {type === 'success' ? (
          <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
        ) : (
          <XCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
        )}
        <p className="flex-1 text-xs sm:text-sm font-medium break-words">{message}</p>
        <button
          onClick={onClose}
          className="flex-shrink-0 hover:bg-white/20 rounded p-0.5 sm:p-1 transition-colors"
        >
          <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
      </div>
    </div>
  );
}
