import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  className?: string; // Additional classes for the dialog content
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, title, className }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      aria-modal="true"
      role="dialog"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-70 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div
        className={`relative bg-gray-900 rounded-2xl shadow-2xl p-8 max-w-2xl w-full text-white animate-scale-in border border-indigo-600 ${className}`}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-full p-1"
          aria-label="Close modal"
        >
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        {title && (
          <h3 id="modal-title" className="text-3xl font-bold mb-6 text-indigo-400 border-b pb-4 border-indigo-700">
            {title}
          </h3>
        )}
        <div className="mt-4">
            {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;