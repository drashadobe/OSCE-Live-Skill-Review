import React, { useRef, useEffect } from 'react';
import type { TranscriptEntry } from '../types';
import { SessionStatus } from '../types';

interface FeedbackPanelProps {
  transcript: TranscriptEntry[];
  status: SessionStatus;
}

const FeedbackPanel: React.FC<FeedbackPanelProps> = ({ transcript, status }) => {
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  const getSpeakerClasses = (speaker: TranscriptEntry['speaker']) => {
    switch (speaker) {
      case 'user':
        return 'bg-violet-700 text-white self-end';
      case 'ai':
        return 'bg-gray-700 text-slate-100 self-start';
      case 'system':
        return 'bg-transparent text-amber-400 self-center text-xs italic';
      default:
        return 'bg-gray-500';
    }
  };

  const getSpeakerLabel = (speaker: TranscriptEntry['speaker']) => {
    switch (speaker) {
      case 'user':
        return 'You';
      case 'ai':
        return 'Examiner';
      default:
        return null;
    }
  }

  return (
    <div className="bg-blue-950/60 backdrop-blur-sm border border-blue-800/50 rounded-lg shadow-2xl flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-blue-800/50">
        <h2 className="text-lg font-bold text-slate-200">AI Examiner Feedback</h2>
        <p className="text-sm text-slate-400">Status: <span className="font-semibold">{status}</span></p>
      </div>
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {transcript.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-slate-500">Awaiting session start...</p>
          </div>
        )}
        {transcript.map((entry, index) => {
          if (entry.speaker === 'summary') {
            return (
              <div key={index} className="bg-gray-800/50 border border-violet-800/50 rounded-lg p-4 my-4">
                <h3 className="text-md font-bold text-violet-300 mb-2">Feedback Summary</h3>
                <p className="text-sm text-slate-300 whitespace-pre-wrap">{entry.text}</p>
              </div>
            );
          }
          return (
            <div key={index} className={`flex flex-col max-w-[85%] ${entry.speaker === 'user' ? 'items-end self-end' : 'items-start self-start'}`}>
              {entry.speaker !== 'system' && <span className="text-xs font-bold text-slate-400 mb-1">{getSpeakerLabel(entry.speaker)}</span>}
              <div
                className={`px-4 py-2 rounded-lg ${getSpeakerClasses(entry.speaker)}`}
              >
                <p className="text-sm">{entry.text}</p>
              </div>
            </div>
          );
        })}
        <div ref={endOfMessagesRef} />
      </div>
    </div>
  );
};

export default FeedbackPanel;