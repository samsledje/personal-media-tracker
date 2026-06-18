import React, { useState, useCallback, useEffect } from 'react';
import { registerToast } from '../services/toastService.js';
import { ToastContext } from '../hooks/useToast.js';

let idCounter = 1;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  // shorter default timeout (2.5s) per request
  const show = useCallback((message, { type = 'info', timeout = 2500 } = {}) => {
    const id = idCounter++;
    setToasts((t) => [...t, { id, message, type }]);
    if (timeout > 0) {
      setTimeout(() => {
        setToasts((t) => t.filter(x => x.id !== id));
      }, timeout);
    }
    return id;
  }, []);

  const hide = useCallback((id) => {
    setToasts((t) => t.filter(x => x.id !== id));
  }, []);

  // register global function so non-react modules can use toasts
  useEffect(() => {
    registerToast(show);
    return () => registerToast(null);
  }, [show]);

  return (
    <ToastContext.Provider value={{ show, hide }}>
      {children}
      <div className="fixed right-4 top-4 z-50 flex flex-col gap-2 items-end">
        {toasts.map(t => (
          <div
            key={t.id}
            role="status"
            onClick={() => hide(t.id)}
            className={`max-w-sm w-full px-4 py-3 rounded shadow-lg text-sm text-white cursor-pointer transform transition-all duration-150 ease-out hover:-translate-y-0.5`}
            style={{
              // Use explicit semi-transparent colors for success/error and the theme highlight for info
              // error stays red; success now uses the project's highlight color so colors are consistent
              backgroundColor: t.type === 'error'
                ? 'rgba(220,38,38,0.92)'
                : 'rgba(var(--mt-highlight-rgb, 16,185,129), 0.92)',
              boxShadow: '0 6px 18px rgba(2,6,23,0.4)',
              border: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'saturate(120%)',
              opacity: 0.98
            }}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export default ToastProvider;
