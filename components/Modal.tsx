
import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string; // e.g., 'max-w-4xl', 'max-w-[80%]'
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer, maxWidth = 'max-w-md' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className={`bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full ${maxWidth} max-h-[95vh] overflow-hidden animate-in zoom-in-95 duration-300 border dark:border-slate-800 transition-colors flex flex-col`}>
        {/* Fixed Header */}
        <div className="px-6 py-4 md:px-8 md:py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-[#0f172a] text-white shrink-0">
          <h3 className="font-black uppercase tracking-widest text-[10px] md:text-xs">{title}</h3>
          <button 
            onClick={onClose} 
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 hover:scale-110 active:scale-95 transition-all"
            aria-label="Close Modal"
          >
            <i className="fas fa-times text-sm"></i>
          </button>
        </div>
        
        {/* Scrollable Body */}
        <div className="p-5 md:p-10 overflow-y-auto custom-scrollbar dark:text-slate-100 flex-1">
          {children}
        </div>
        
        {/* Fixed Footer (Optional) */}
        {footer && (
          <div className="px-6 py-5 border-t border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-end space-x-3 transition-colors shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
