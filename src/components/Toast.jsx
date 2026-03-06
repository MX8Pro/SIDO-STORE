import React from 'react';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import { CheckCircle, XCircle } from 'lucide-react';

const Toast = ({ toast, transition }) => (
  <AnimatePresence>
    {toast.show && (
      <Motion.div
        key="toast"
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={transition}
        exit={{ opacity: 0, y: -50 }}
        className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] flex justify-center pointer-events-none"
      >
        <div
          className={`px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 text-sm font-bold text-white ${
            toast.type === 'error' ? 'bg-red-600' : toast.type === 'success' ? 'bg-emerald-600' : 'bg-slate-900'
          }`}
        >
          {toast.type === 'error' ? (
            <XCircle size={18} />
          ) : (
            <CheckCircle size={18} className="text-emerald-100" />
          )}
          {toast.message}
        </div>
      </Motion.div>
    )}
  </AnimatePresence>
);

export default Toast;
