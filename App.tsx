
import React, { useState, useRef, useCallback, useEffect } from 'react';
// FIX: The 'LiveSession' type is not exported from the '@google/genai' package. It has been removed.
import { GoogleGenAI, LiveServerMessage, Modality, Blob, FunctionDeclaration, Type } from '@google/genai';
import VideoPlayer from './components/VideoPlayer';
import FeedbackPanel from './components/FeedbackPanel';
import RubricPanel from './components/RubricPanel';
import InstructionsPanel from './components/InstructionsPanel';
import ConfirmationDialog from './components/ConfirmationDialog';
import ResumeDialog from './components/ResumeDialog';
import WelcomeForm from './components/WelcomeForm';
import Timer from './components/Timer';
import { SessionStatus, type TranscriptEntry, type RubricItem, RubricStatus, INITIAL_RUBRIC, type RubricSuggestion, type UserDetails } from './types';
import { encode, decode, decodeAudioData } from './utils/audioUtils';

// Constants
const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;
const FRAME_RATE = 2; // fps for video stream
const JPEG_QUALITY = 0.7;

const App: React.FC = () => {
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>(SessionStatus.IDLE);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  // FIX: Corrected a typo in the constant name from `INITIAL_RUBric` to `INITIAL_RUBRIC`.
  const [rubric, setRubric] = useState<RubricItem[]>(INITIAL_RUBRIC);
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  const [showEmailDialog, setShowEmailDialog] = useState<boolean>(false);
  const [suggestedUpdate, setSuggestedUpdate] = useState<RubricSuggestion | null>(null);
  const [savedSessionData, setSavedSessionData] = useState<{ transcript: TranscriptEntry[], rubric: RubricItem[] } | null>(null);
  const [isCheckingForSession, setIsCheckingForSession] = useState<boolean>(true);
  const [isUserDetailsSubmitted, setIsUserDetailsSubmitted] = useState<boolean>(false);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [sessionDuration, setSessionDuration] = useState<number | null>(null); // in seconds
  const [summaryText, setSummaryText] = useState<string | null>(null);

  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // FIX: The `LiveSession` type is not exported by the `@google/genai` package.
  // Replaced it with an inferred type using `ReturnType` on `GoogleGenAI['live']['connect']`
  // to correctly type the session promise ref.
  const sessionPromiseRef = useRef<ReturnType<GoogleGenAI['live']['connect']> | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const frameIntervalRef = useRef<number | null>(null);

  // Audio playback refs
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // Transcription refs
  const currentInputTranscriptionRef = useRef('');
  const currentOutputTranscriptionRef = useRef('');
  
  const aiRef = useRef<GoogleGenAI | null>(null);
  const hasSuggestionRef = useRef(false);

  // Refs to hold latest state for use in callbacks with stale closures
  const transcriptRef = useRef(transcript);
  useEffect(() => { transcriptRef.current = transcript; }, [transcript]);
  const rubricRef = useRef(rubric);
  useEffect(() => { rubricRef.current = rubric; }, [rubric]);

  useEffect(() => {
    try {
      const savedDataString = localStorage.getItem('osce_saved_session');
      if (savedDataString) {
        const savedData = JSON.parse(savedDataString);
        if (savedData.transcript && savedData.rubric) {
          setSavedSessionData(savedData);
        }
      }
    } catch (error) {
      console.error("Failed to load session from localStorage", error);
      localStorage.removeItem('osce_saved_session');
    }
    setIsCheckingForSession(false);
  }, []);

  const addToTranscript = useCallback((entry: TranscriptEntry) => {
    setTranscript(prev => [...prev, entry]);
  }, []);

  // FIX: Refactored stopSession to only handle cleanup and summary generation.
  // Status updates are now handled by the callers to prevent race conditions and stale state issues.
  // This resolves the TypeScript error on line 84.
  const stopSession = useCallback(async (currentTranscript?: TranscriptEntry[], finalRubric?: RubricItem[]) => {
    setSessionStartTime(null);
    // --- Stop all media streams and connections ---
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
    if (scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current = null;
    }
    if (mediaStreamSourceRef.current) {
        mediaStreamSourceRef.current.disconnect();
        mediaStreamSourceRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    sessionPromiseRef.current?.then(session => session.close());
    sessionPromiseRef.current = null;
    for (const source of sourcesRef.current.values()) {
        source.stop();
    }
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;
    setSuggestedUpdate(null);
    hasSuggestionRef.current = false;


    // --- Generate summary if transcript and rubric are provided ---
    if (aiRef.current && currentTranscript && finalRubric) {
      addToTranscript({ speaker: 'system', text: 'Session ended. Generating feedback summary...' });
      try {
        const formattedTranscript = currentTranscript
          .filter(entry => entry.speaker === 'user' || entry.speaker === 'ai')
          .map(entry => `${entry.speaker === 'user' ? 'Student' : 'Examiner'}: ${entry.text}`)
          .join('\n');
          
        const formattedRubric = finalRubric
          .map(item => `- ${item.skill}: ${item.status.replace('_', ' ')}`)
          .join('\n');

        const prompt = `You are an AI clinical examiner summarizing an OSCE session.
Based on the following transcript and final rubric checklist, provide a concise summary of the student's performance.
Address the student directly. Highlight areas of strength and suggest specific areas for improvement.
Keep the summary to 2-3 paragraphs.

Transcript:
${formattedTranscript}

Rubric:
${formattedRubric}

Summary:`;
        
        const response = await aiRef.current.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });
        
        const summary = response.text;
        addToTranscript({ speaker: 'summary', text: summary });
        setSummaryText(summary);


      } catch (error) {
        const message = error instanceof Error ? error.message : "An unknown error occurred.";
        console.error('Failed to generate summary:', error);
        addToTranscript({ speaker: 'system', text: `Could not generate summary: ${message}` });
      }
    } else {
       addToTranscript({ speaker: 'system', text: 'Session ended.' });
    }
  }, [addToTranscript]);

  useEffect(() => {
    // Cleanup on unmount, don't generate summary
    return () => {
      stopSession();
    };
  }, [stopSession]);

  const handleUpdateRubric = useCallback((skillId: string, newStatus: RubricStatus) => {
    setRubric(prevRubric =>
      prevRubric.map(item =>
        item.id === skillId ? { ...item, status: newStatus } : item
      )
    );
  }, []);

  const handleSuggestion = useCallback((accepted: boolean, suggestion: RubricSuggestion | null) => {
    if (!suggestion) return;

    if (accepted) {
      handleUpdateRubric(suggestion.skillId, suggestion.status);
    }
    
    setSuggestedUpdate(null);
    hasSuggestionRef.current = false;

    sessionPromiseRef.current?.then(session => {
      session.sendToolResponse({
        functionResponses: {
          id: suggestion.toolCallId,
          name: 'suggestRubricUpdate',
          response: { result: `User has ${accepted ? 'accepted' : 'rejected'} the suggestion for ${suggestion.skillId}.` },
        }
      })
    });
  }, [handleUpdateRubric]);

  const handleConfirmEndSession = useCallback(() => {
    setShowConfirmation(false);
    // Save state on successful completion using refs to avoid stale state
    try {
        const sessionToSave = { transcript: transcriptRef.current, rubric: rubricRef.current };
        localStorage.setItem('osce_saved_session', JSON.stringify(sessionToSave));
    } catch (error) {
        console.error("Failed to save session to localStorage", error);
    }
    stopSession(transcriptRef.current, rubricRef.current);
    setSessionStatus(SessionStatus.ENDED);
  }, [stopSession]);

  const handleTimeUp = useCallback(() => {
    addToTranscript({ speaker: 'system', text: 'Time is up. Automatically ending session.' });
    // This will trigger the summary generation and cleanup
    handleConfirmEndSession();
  }, [addToTranscript, handleConfirmEndSession]);
  

  const handleStartSession = useCallback(async () => {
    localStorage.removeItem('osce_saved_session');
    if (sessionStatus !== SessionStatus.IDLE && sessionStatus !== SessionStatus.ENDED && sessionStatus !== SessionStatus.ERROR) return;

    setTranscript([]);
    setRubric(INITIAL_RUBRIC.map(item => ({ ...item, status: RubricStatus.PENDING })));
    setSuggestedUpdate(null);
    hasSuggestionRef.current = false;
    setSessionStartTime(null);
    setSummaryText(null);
    addToTranscript({speaker: 'system', text: 'Initializing session...'});
    setSessionStatus(SessionStatus.CONNECTING);
    
    try {
      if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set.");
      }
      aiRef.current = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const supportedConstraints = navigator.mediaDevices.getSupportedConstraints();
      const audioConstraints: MediaTrackConstraints = {};
      const enabledEnhancements: string[] = [];

      if (supportedConstraints.noiseSuppression) {
        audioConstraints.noiseSuppression = true;
        enabledEnhancements.push('noise suppression');
      }
      if (supportedConstraints.echoCancellation) {
        audioConstraints.echoCancellation = true;
        enabledEnhancements.push('echo cancellation');
      }

      streamRef.current = await navigator.mediaDevices.getUserMedia({ 
        audio: Object.keys(audioConstraints).length > 0 ? audioConstraints : true, 
        video: true 
      });

      if (enabledEnhancements.length > 0) {
        addToTranscript({ speaker: 'system', text: `Audio enhancements enabled: ${enabledEnhancements.join(', ')}.`});
      }

      if (videoRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }

      // Initialize audio contexts
      const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: INPUT_SAMPLE_RATE });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: OUTPUT_SAMPLE_RATE });
      
      const onMessage = async (message: LiveServerMessage) => {
        // Handle audio output
        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
        if (base64Audio && outputAudioContextRef.current) {
          nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContextRef.current.currentTime);
          const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContextRef.current, OUTPUT_SAMPLE_RATE, 1);
          const source = outputAudioContextRef.current.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(outputAudioContextRef.current.destination);
          source.addEventListener('ended', () => sourcesRef.current.delete(source));
          source.start(nextStartTimeRef.current);
          nextStartTimeRef.current += audioBuffer.duration;
          sourcesRef.current.add(source);
        }

        // Handle tool calls for rubric
        if (message.toolCall) {
          for (const fc of message.toolCall.functionCalls) {
              if (fc.name === 'suggestRubricUpdate') {
                  const { skillId, status, reasoning } = fc.args as { skillId: string; status: RubricStatus; reasoning: string };
                  if (hasSuggestionRef.current) {
                      sessionPromiseRef.current?.then(session => {
                          session.sendToolResponse({
                              functionResponses: {
                                  id : fc.id,
                                  name: fc.name,
                                  response: { result: `Suggestion for ${skillId} ignored as another suggestion is pending.` },
                              }
                          });
                      });
                  } else {
                      hasSuggestionRef.current = true;
                      setSuggestedUpdate({
                          skillId,
                          status,
                          reasoning,
                          toolCallId: fc.id,
                      });
                  }
              }
          }
        }

        // Handle transcription
        if (message.serverContent?.outputTranscription) {
            currentOutputTranscriptionRef.current += message.serverContent.outputTranscription.text;
        }
        if (message.serverContent?.inputTranscription) {
            currentInputTranscriptionRef.current += message.serverContent.inputTranscription.text;
        }

        if (message.serverContent?.turnComplete) {
            if (currentInputTranscriptionRef.current.trim()) {
                addToTranscript({ speaker: 'user', text: currentInputTranscriptionRef.current.trim() });
            }
            if (currentOutputTranscriptionRef.current.trim()) {
                addToTranscript({ speaker: 'ai', text: currentOutputTranscriptionRef.current.trim() });
            }
            currentInputTranscriptionRef.current = '';
            currentOutputTranscriptionRef.current = '';
        }

        if (message.serverContent?.interrupted) {
            for (const source of sourcesRef.current.values()) {
              source.stop();
              sourcesRef.current.delete(source);
            }
            nextStartTimeRef.current = 0;
        }
      };

      const suggestRubricUpdateFunction: FunctionDeclaration = {
          name: 'suggestRubricUpdate',
          description: 'Suggests an update to the status of a specific skill in the OSCE checklist based on an observation. Await user confirmation before proceeding.',
          parameters: {
              type: Type.OBJECT,
              properties: {
                  skillId: {
                      type: Type.STRING,
                      description: `The unique ID of the skill to update. Available IDs: ${INITIAL_RUBRIC.map(i => i.id).join(', ')}.`,
                  },
                  status: {
                      type: Type.STRING,
                      description: `The new status to suggest for the skill. Must be one of: '${RubricStatus.MET}' or '${RubricStatus.NOT_MET}'.`,
                      enum: [RubricStatus.MET, RubricStatus.NOT_MET],
                  },
                   reasoning: {
                        type: Type.STRING,
                        description: 'A brief explanation for why this update is being suggested. E.g., "The student washed their hands before touching the patient."'
                    }
              },
              required: ['skillId', 'status', 'reasoning'],
          },
      };

      sessionPromiseRef.current = aiRef.current.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setSessionStatus(SessionStatus.LIVE);
            setSessionStartTime(Date.now());
            addToTranscript({speaker: 'system', text: 'Connection established. You may begin.'});
            
            mediaStreamSourceRef.current = inputAudioContext.createMediaStreamSource(streamRef.current!);
            scriptProcessorRef.current = inputAudioContext.createScriptProcessor(4096, 1, 1);
            
            scriptProcessorRef.current.onaudioprocess = (event) => {
              const inputData = event.inputBuffer.getChannelData(0);
              const pcmBlob: Blob = {
                data: encode(new Uint8Array(new Int16Array(inputData.map(x => x * 32768)).buffer)),
                mimeType: `audio/pcm;rate=${INPUT_SAMPLE_RATE}`,
              };
              sessionPromiseRef.current?.then(session => session.sendRealtimeInput({ media: pcmBlob }));
            };

            mediaStreamSourceRef.current.connect(scriptProcessorRef.current);
            scriptProcessorRef.current.connect(inputAudioContext.destination);

            frameIntervalRef.current = window.setInterval(() => {
              const video = videoRef.current;
              const canvas = canvasRef.current;
              if (video && canvas && video.readyState >= 2) {
                const ctx = canvas.getContext('2d');
                if (!ctx) return;
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
                canvas.toBlob(async (blob) => {
                  if (blob) {
                    const reader = new FileReader();
                    reader.onload = () => {
                      const base64Data = (reader.result as string).split(',')[1];
                      sessionPromiseRef.current?.then(session => session.sendRealtimeInput({
                        media: { data: base64Data, mimeType: 'image/jpeg' }
                      }));
                    };
                    reader.readAsDataURL(blob);
                  }
                }, 'image/jpeg', JPEG_QUALITY);
              }
            }, 1000 / FRAME_RATE);

          },
          onmessage: onMessage,
          onerror: (e: ErrorEvent) => {
            console.error('Session error:', e);
            addToTranscript({ speaker: 'system', text: `An error occurred: ${e.message}` });
            setSessionStatus(SessionStatus.ERROR);
            stopSession();
             // Save state on error
            try {
                const sessionToSave = { transcript: transcriptRef.current, rubric: rubricRef.current };
                localStorage.setItem('osce_saved_session', JSON.stringify(sessionToSave));
            } catch (saveError) {
                console.error("Failed to save session on error", saveError);
            }
          },
          onclose: (e: CloseEvent) => {
             console.log('Session closed');
             // FIX: Use functional update to avoid race conditions with stale state.
             setSessionStatus((prevStatus) => {
                if (prevStatus !== SessionStatus.ERROR && prevStatus !== SessionStatus.ENDED) {
                    // If stopSession wasn't called by an error or button, save session state and transition to ENDED.
                    try {
                        const sessionToSave = { transcript: transcriptRef.current, rubric: rubricRef.current };
                        localStorage.setItem('osce_saved_session', JSON.stringify(sessionToSave));
                    } catch (saveError) {
                        console.error("Failed to save session on close", saveError);
                    }
                    addToTranscript({ speaker: 'system', text: 'Session closed by server.' });
                    return SessionStatus.ENDED;
                }
                return prevStatus;
             });
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          tools: [{ functionDeclarations: [suggestRubricUpdateFunction] }],
          systemInstruction: `You are an AI clinical examiner for an OSCE (Objective Structured Clinical Examination). Your role is to observe a medical student performing a clinical skill via live video and audio.
- Observe the student's actions and words carefully.
- Based on their performance, you MUST call the 'suggestRubricUpdate' function to suggest a checklist update. Provide a clear reason for your suggestion. Do not update the checklist directly; you must await user confirmation.
- For each item in the checklist, call the function with the appropriate 'skillId', 'status' ('met' or 'not_met'), and a concise 'reasoning'.
- Provide verbal feedback and guidance to the student as if you were a real examiner in the room. Be encouraging but professional.
- Address the student directly.
- Do not suggest evaluating all criteria at once. Suggest an update as you observe the actions. For example, when you see them wash their hands, immediately call the function to suggest updating 'hand_hygiene' to 'met'.`
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "An unknown error occurred.";
      console.error('Failed to start session:', error);
      addToTranscript({ speaker: 'system', text: `Failed to start session: ${message}` });
      setSessionStatus(SessionStatus.ERROR);
    }
  }, [sessionStatus, addToTranscript, stopSession, handleUpdateRubric]);

  const handleMainButtonClick = () => {
    if (sessionStatus === SessionStatus.LIVE) {
      setShowConfirmation(true);
    } else {
      handleStartSession();
    }
  };

  const handleResumeSession = () => {
    if (savedSessionData) {
      setTranscript(savedSessionData.transcript);
      setRubric(savedSessionData.rubric);
      // Manually add summary if it exists, for email functionality
      const summaryEntry = savedSessionData.transcript.find(e => e.speaker === 'summary');
      if (summaryEntry) {
          setSummaryText(summaryEntry.text);
      }
      setSessionStatus(SessionStatus.ENDED); // Set to ended so they can review
      setSavedSessionData(null);
      localStorage.removeItem('osce_saved_session');
    }
  };

  const handleStartNewSessionFresh = () => {
    localStorage.removeItem('osce_saved_session');
    setSavedSessionData(null);
  };

  const handleUserDetailsSubmit = (details: UserDetails, durationInMinutes: number) => {
    setUserDetails(details);
    setSessionDuration(durationInMinutes * 60); // Convert minutes to seconds
    setIsUserDetailsSubmitted(true);
  };
  
  const handleConfirmSendEmail = useCallback(() => {
    setShowEmailDialog(false);
    if (!userDetails || !summaryText) {
        alert("Cannot send email: User details or summary is missing.");
        return;
    }

    const formatRubricForEmail = (rubricItems: RubricItem[]) => {
        return rubricItems
            .map(item => `• ${item.skill}: ${item.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`)
            .join('\n');
    };

    const formatTranscriptForEmail = (transcriptEntries: TranscriptEntry[]) => {
        return transcriptEntries
            .filter(entry => entry.speaker === 'user' || entry.speaker === 'ai')
            .map(entry => `${entry.speaker === 'user' ? 'Student' : 'Examiner'}: ${entry.text}`)
            .join('\n\n');
    };

    const subject = `OSCE Skill Review Report for ${userDetails.name}`;
    const body = `Dear ${userDetails.name},

Here is the report for your recent OSCE skill review session.

--- FEEDBACK SUMMARY ---
${summaryText}

--- FINAL RUBRIC CHECKLIST ---
${formatRubricForEmail(rubric)}

--- SESSION DETAILS ---
Name: ${userDetails.name}
Phone: ${userDetails.phone}
Designation: ${userDetails.designation}

--- FULL TRANSCRIPT ---
${formatTranscriptForEmail(transcript)}

Best regards,
The AI Clinical Examiner
    `;

    const mailtoLink = `mailto:drashadobe@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body.trim())}`;
    
    // Using window.open to avoid navigating away from the page
    window.open(mailtoLink, '_blank');

  }, [userDetails, summaryText, rubric, transcript]);


  if (isCheckingForSession) {
    return (
        <div className="fixed inset-0 bg-gray-900 flex items-center justify-center z-50">
            <p className="text-slate-400">Loading...</p>
        </div>
    );
  }

  if (savedSessionData) {
    return <ResumeDialog onResume={handleResumeSession} onStartNew={handleStartNewSessionFresh} />;
  }

  if (!isUserDetailsSubmitted) {
    return <WelcomeForm onSubmit={handleUserDetailsSubmit} />;
  }

  return (
    <main className="container mx-auto p-4 h-screen max-h-screen grid grid-rows-[auto,1fr] gap-4">
      <header className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">OSCE Live Skill Review</h1>
            <p className="text-slate-400">Your personal AI-powered clinical skills examiner.</p>
          </div>
          <Timer
            sessionStatus={sessionStatus}
            startTime={sessionStartTime}
            duration={sessionDuration}
            onTimeUp={handleTimeUp}
          />
        </div>
        <div className="flex items-center gap-4">
            {sessionStatus === SessionStatus.ENDED && summaryText && (
              <button
                onClick={() => setShowEmailDialog(true)}
                className="px-6 py-2 rounded-md font-semibold text-white transition-all shadow-lg bg-emerald-600 hover:bg-emerald-700 flex items-center gap-2"
                title="Open in your default email client"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                Email Report
              </button>
            )}
            <button
              onClick={handleMainButtonClick}
              disabled={sessionStatus === SessionStatus.CONNECTING}
              className={`px-6 py-2 rounded-md font-semibold text-white transition-all shadow-lg ${
                sessionStatus === SessionStatus.LIVE
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-violet-600 hover:bg-violet-700'
              } disabled:bg-slate-500 disabled:cursor-not-allowed`}
            >
              {sessionStatus === SessionStatus.CONNECTING && 'Starting...'}
              {sessionStatus === SessionStatus.LIVE && 'End Session'}
              {(sessionStatus === SessionStatus.IDLE || sessionStatus === SessionStatus.ENDED || sessionStatus === SessionStatus.ERROR) && 'Start New Session'}
            </button>
        </div>
      </header>
      <div className="grid grid-cols-5 gap-4 h-full overflow-hidden">
        <div className="col-span-3 h-full">
            {(sessionStatus === SessionStatus.LIVE || sessionStatus === SessionStatus.CONNECTING) ? (
              <VideoPlayer ref={videoRef} canvasRef={canvasRef} />
            ) : (
              <InstructionsPanel />
            )}
        </div>
        <div className="col-span-2 h-full grid grid-rows-2 gap-4">
            <RubricPanel
              rubric={rubric}
              onUpdateRubric={handleUpdateRubric}
              suggestedUpdate={suggestedUpdate}
              onConfirmSuggestion={() => handleSuggestion(true, suggestedUpdate)}
              onRejectSuggestion={() => handleSuggestion(false, suggestedUpdate)}
            />
            <FeedbackPanel transcript={transcript} status={sessionStatus} />
        </div>
      </div>
      <ConfirmationDialog
        isOpen={showConfirmation}
        onConfirm={handleConfirmEndSession}
        onCancel={() => setShowConfirmation(false)}
        title="End Session?"
        message="Are you sure you want to end the current OSCE session? This action cannot be undone."
        confirmButtonText="End Session"
        confirmButtonVariant="destructive"
      />
      <ConfirmationDialog
        isOpen={showEmailDialog}
        onConfirm={handleConfirmSendEmail}
        onCancel={() => setShowEmailDialog(false)}
        title="Prepare Email Report"
        message="This will open your default email application (like Outlook or Gmail) with the report pre-filled. Do you want to continue?"
        confirmButtonText="Yes, Open Email Client"
        confirmButtonVariant="primary"
      />
    </main>
  );
};

export default App;