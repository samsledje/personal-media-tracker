let toastFn = null;

export const registerToast = (fn) => {
  toastFn = fn;
};

export const toast = (message, opts = {}) => {
  // Convert null/undefined opts to empty object
  const options = opts == null ? {} : opts;
  if (toastFn) {
    try {
      toastFn(message, options);
    } catch (error) {
      // Silently handle errors from toast function
      console.error('Error in toast function:', error);
    }
  } else {
    // fallback to console
    console.log('TOAST:', message, options);
  }
};

export default toast;
