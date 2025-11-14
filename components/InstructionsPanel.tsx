import React from 'react';

const InstructionItem: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({ icon, title, description }) => (
    <li className="flex items-start space-x-4">
        <div className="flex-shrink-0 text-violet-400 w-6 h-6 mt-1">{icon}</div>
        <div>
            <h3 className="font-semibold text-slate-100">{title}</h3>
            <p className="text-sm text-slate-400">{description}</p>
        </div>
    </li>
);

const InstructionsPanel: React.FC = () => {
  return (
    <div className="relative w-full h-full bg-gray-950 rounded-lg overflow-hidden shadow-2xl flex flex-col items-center justify-center p-8 text-center">
      <div className="max-w-lg w-full">
        <h2 className="text-3xl font-bold text-slate-100 mb-4">Examination Instructions</h2>
        <p className="text-slate-400 mb-8">
          Prepare for your OSCE session by following the steps below.
        </p>
        <ul className="space-y-5 text-left bg-blue-950/40 p-6 rounded-lg border border-blue-800/50">
          <InstructionItem
            icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.375 1.439L7.5 21M9 17.25v-1.5M9 17.25H3.75m1.5-1.5H5.625c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125h1.5m-1.5-1.5h1.5m-1.5-1.5H3.75m0 0h1.5m2.125-9.75c.371.054.74.124 1.11.203.37.079.73.17.11.269.37.1.73.208 1.09.333m-2.22 0c.68.192 1.33.402 1.94.633m-1.94-.633c-.68.231-1.33.442-1.94.633m1.94-.633c.68.192 1.33.402 1.94.633M12 9.75l-1.01.401a1.125 1.125 0 01-1.225 0l-1.01-.401M12 9.75l1.01.401a1.125 1.125 0 001.225 0l1.01-.401M12 9.75v1.5m0-1.5a1.125 1.125 0 01-1.06.814l-1.01.401m1.06-.814a1.125 1.125 0 001.06.814l1.01.401m-2.07 0a1.125 1.125 0 01-1.225 0l-1.01-.401m1.225 0a1.125 1.125 0 001.225 0l1.01-.401m-3.285 4.468a1.125 1.125 0 01-1.225 0l-1.01-.401m1.225 0a1.125 1.125 0 001.225 0l1.01-.401m-2.07 0a1.125 1.125 0 01-1.225 0l-1.01-.401m1.225 0a1.125 1.125 0 001.225 0l1.01-.401M6.75 12.75l-.98.392a1.125 1.125 0 01-1.225 0l-.98-.392m2.205 0a1.125 1.125 0 00-1.225 0l-.98-.392m2.205 0a1.125 1.125 0 011.225 0l.98.392m-2.205 0a1.125 1.125 0 001.225 0l.98.392m-2.205 0l-.98.392" /></svg>}
            title="Quiet & Well-Lit Environment"
            description="Find a space where you will not be interrupted and have good lighting."
          />
          <InstructionItem
            icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.776 48.776 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" /></svg>}
            title="Camera Positioning"
            description="Clearly show your face, hands, and any equipment you will be using."
          />
           <InstructionItem
            icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m12 0v-1.5a6 6 0 00-6-6v0a6 6 0 00-6 6v1.5m12 0v-1.5a6 6 0 00-6-6v0a6 6 0 00-6 6v1.5" /></svg>}
            title="Clear Audio"
            description="Ensure your microphone is working and speak clearly during the session."
          />
          <InstructionItem
            icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-2.25-1.313M21 7.5v2.25m0-2.25l-2.25 1.313M3 7.5l2.25-1.313M3 7.5l2.25 1.313M3 7.5v2.25m9 3l2.25-1.313M12 12.75l-2.25-1.313M12 12.75V15m0-2.25l2.25 1.313M12 12.75l-2.25 1.313M6 16.5l2.25-1.313M6 16.5l2.25 1.313M6 16.5v2.25m8.25-6l2.25-1.313M16.5 10.5l-2.25-1.313M16.5 10.5l2.25 1.313M16.5 10.5V12m-7.5-3l-2.25-1.313M9 7.5l2.25-1.313M9 7.5v2.25m.75 3l2.25-1.313M9.75 12.75l-2.25-1.313M9.75 12.75V15m3-4.5l-2.25-1.313m2.25 1.313l-2.25 1.313m0 0v2.25" /></svg>}
            title="Equipment Ready"
            description="Gather any necessary medical equipment for the clinical skill."
          />
        </ul>
        <p className="mt-8 text-slate-500 text-sm">When you are fully prepared, click the "Start Session" button above to begin.</p>
      </div>
    </div>
  );
};

export default InstructionsPanel;