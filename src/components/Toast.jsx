import { useEffect } from 'react';

function Toast({ message, onClose, duration = 2500 }) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div className="toast-overlay" onClick={onClose}>
      <div className="toast" onClick={(e) => e.stopPropagation()}>
        <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mb-3">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-emerald-400">
            <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <p className="text-white text-center font-medium">{message}</p>
      </div>
    </div>
  );
}

export default Toast;
