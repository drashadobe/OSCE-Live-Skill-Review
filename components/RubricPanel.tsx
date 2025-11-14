import React from 'react';
import type { RubricItem, RubricSuggestion } from '../types';
import { RubricStatus } from '../types';

interface RubricPanelProps {
  rubric: RubricItem[];
  onUpdateRubric: (skillId: string, newStatus: RubricStatus) => void;
  suggestedUpdate: RubricSuggestion | null;
  onConfirmSuggestion: () => void;
  onRejectSuggestion: () => void;
}

const RubricPanel: React.FC<RubricPanelProps> = ({ rubric, onUpdateRubric, suggestedUpdate, onConfirmSuggestion, onRejectSuggestion }) => {
  const getStatusIcon = (status: RubricStatus) => {
    switch (status) {
      case RubricStatus.MET:
        return (
          <svg className="w-6 h-6 text-emerald-400" fill="currentColor" viewBox="0 0 20 20" aria-label="Met">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case RubricStatus.NOT_MET:
        return (
          <svg className="w-6 h-6 text-rose-500" fill="currentColor" viewBox="0 0 20 20" aria-label="Not Met">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      case RubricStatus.PENDING:
      default:
        return <div className="w-6 h-6 border-2 border-gray-500 rounded-full" aria-label="Pending"></div>;
    }
  };

  const getStatusTextColor = (status: RubricStatus) => {
    switch(status) {
      case RubricStatus.MET: return 'text-slate-300';
      case RubricStatus.NOT_MET: return 'text-slate-500 line-through';
      default: return 'text-slate-400';
    }
  }

  const handleStatusClick = (item: RubricItem) => {
    let nextStatus: RubricStatus;
    switch (item.status) {
      case RubricStatus.PENDING:
        nextStatus = RubricStatus.MET;
        break;
      case RubricStatus.MET:
        nextStatus = RubricStatus.NOT_MET;
        break;
      case RubricStatus.NOT_MET:
        nextStatus = RubricStatus.PENDING;
        break;
      default:
        nextStatus = RubricStatus.PENDING;
    }
    onUpdateRubric(item.id, nextStatus);
  };

  const isSuggestionActiveForItem = (itemId: string) => {
    return suggestedUpdate && suggestedUpdate.skillId === itemId;
  }


  return (
    <div className="bg-blue-950/60 backdrop-blur-sm border border-blue-800/50 rounded-lg shadow-2xl flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-blue-800/50">
        <h2 className="text-lg font-bold text-slate-200">OSCE Checklist</h2>
        <p className="text-sm text-slate-400">Real-time Skill Assessment</p>
      </div>
      <div className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-4">
          {rubric.map((item) => (
            <li key={item.id} className="flex items-start space-x-4">
              <div className="flex-shrink-0 pt-1">
                <button
                  onClick={() => handleStatusClick(item)}
                  disabled={isSuggestionActiveForItem(item.id)}
                  className="rounded-full transition-all duration-150 ease-in-out hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-violet-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                  title="Click to change status"
                  aria-label={`Change status for ${item.skill}`}
                >
                  {getStatusIcon(item.status)}
                </button>
              </div>
              <div className="flex-1">
                <p className={`font-semibold ${getStatusTextColor(item.status)}`}>{item.skill}</p>
                 {isSuggestionActiveForItem(item.id) ? (
                    <div className="mt-2 bg-gray-800/50 border border-violet-600 p-3 rounded-md w-full animate-pulse-once">
                        <p className="text-sm text-violet-300 font-semibold mb-1">AI Suggestion:</p>
                        <blockquote className="text-sm text-slate-300 mb-3 italic border-l-2 border-violet-500 pl-2">
                            "{suggestedUpdate.reasoning}"
                        </blockquote>
                        <div className="flex justify-end space-x-2">
                        <button 
                            onClick={onRejectSuggestion}
                            className="px-3 py-1 text-xs font-semibold text-white bg-gray-600 hover:bg-gray-500 rounded-md transition-colors"
                        >
                            Reject
                        </button>
                        <button 
                            onClick={onConfirmSuggestion}
                            className="px-3 py-1 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 rounded-md transition-colors"
                        >
                            Confirm
                        </button>
                        </div>
                    </div>
                 ) : (
                    <p className="text-sm text-slate-500">{item.description}</p>
                 )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default RubricPanel;