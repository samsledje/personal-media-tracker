import { createContext, useContext } from 'react';

/**
 * Context carrying the toast API ({ show, hide }). Provided by ToastProvider.
 * Kept in its own module so ToastProvider.jsx only exports a component
 * (required for React Fast Refresh).
 */
export const ToastContext = createContext(null);

/**
 * Access the toast API from within the ToastProvider tree.
 * @returns {{ show: Function, hide: Function } | null}
 */
export const useToast = () => useContext(ToastContext);
