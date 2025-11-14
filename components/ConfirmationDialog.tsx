
import React from 'react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  confirmButtonVariant?: 'primary' | 'destructive';
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  confirmButtonText = 'Confirm',
  cancelButtonText = 'Cancel',
  confirmButtonVariant = 'destructive',
}) => {
  if (!isOpen) {
    return null;
  }

  const confirmButtonClasses = {
    primary: 'bg-violet-600 hover:bg-violet-700',
    destructive: 'bg-red-600 hover:bg-red-700',
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
      aria-modal="true"
      role="dialog"
      aria-labelledby="dialog-title"
    >
      <div className="bg-blue-950/80 backdrop-blur-sm border border-blue-800/50 rounded-lg shadow-xl p-6 max-w-sm w-full m-4">
        <h2 id="dialog-title" className="text-xl font-bold text-slate-100 mb-2">{title}</h2>
        <p className="text-slate-400 mb-6">{message}</p>
        <div className="flex justify-end space-x-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-md font-semibold bg-gray-600 hover:bg-gray-500 text-white transition-colors"
          >
            {cancelButtonText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-md font-semibold text-white transition-colors ${confirmButtonClasses[confirmButtonVariant]}`}
          >
            {confirmButtonText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationDialog;
