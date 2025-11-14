import React from 'react';

interface ResumeDialogProps {
  onResume: () => void;
  onStartNew: () => void;
}

const ResumeDialog: React.FC<ResumeDialogProps> = ({
  onResume,
  onStartNew,
}) => {
  return (
    <div
      className="fixed inset-0 bg-gray-900 flex items-center justify-center z-50"
      aria-modal="true"
      role="dialog"
      aria-labelledby="dialog-title"
    >
      <div className="bg-blue-950/80 backdrop-blur-sm border border-blue-800/50 rounded-lg shadow-xl p-6 max-w-md w-full m-4 text-center">
        <h2 id="dialog-title" className="text-2xl font-bold text-slate-100 mb-3">Previous Session Found</h2>
        <p className="text-slate-400 mb-8">We found a saved session. Would you like to review it or start a new one?</p>
        <div className="flex justify-center space-x-4">
          <button
            onClick={onStartNew}
            className="px-6 py-3 rounded-md font-semibold bg-gray-600 hover:bg-gray-500 text-white transition-colors"
          >
            Start New Session
          </button>
          <button
            onClick={onResume}
            className="px-6 py-3 rounded-md font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-colors"
          >
            Review Previous Session
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResumeDialog;