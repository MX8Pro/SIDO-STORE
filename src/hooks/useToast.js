import { useRef, useState } from 'react';

const useToast = () => {
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const timerRef = useRef(null);

  const showToast = (message, type = 'success', duration = 3200) => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }

    setToast({ show: true, message, type });

    timerRef.current = window.setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, duration);
  };

  return {
    toast,
    showToast,
  };
};

export { useToast };
