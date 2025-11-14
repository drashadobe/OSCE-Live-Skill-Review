export enum SessionStatus {
  IDLE = 'Not Started',
  CONNECTING = 'Connecting...',
  LIVE = 'Live Session',
  ENDED = 'Session Ended',
  ERROR = 'Error',
}

export interface TranscriptEntry {
  speaker: 'user' | 'ai' | 'system' | 'summary';
  text: string;
}

export enum RubricStatus {
  PENDING = 'pending',
  MET = 'met',
  NOT_MET = 'not_met',
}

export interface RubricItem {
  id: string;
  skill: string;
  description: string;
  status: RubricStatus;
}

export interface RubricSuggestion {
  skillId: string;
  status: RubricStatus;
  reasoning: string;
  toolCallId: string;
}

export interface UserDetails {
  name: string;
  phone: string;
  designation: string;
}

export const INITIAL_RUBRIC: RubricItem[] = [
  {
    id: 'introduction',
    skill: 'Introduction & Consent',
    description: 'Introduces self, confirms patient identity, explains procedure, and gains consent.',
    status: RubricStatus.PENDING,
  },
  {
    id: 'hand_hygiene',
    skill: 'Hand Hygiene',
    description: 'Performs hand hygiene before touching the patient or equipment.',
    status: RubricStatus.PENDING,
  },
  {
    id: 'patient_comfort',
    skill: 'Patient Comfort & Dignity',
    description: 'Ensures patient is comfortable and maintains their dignity throughout.',
    status: RubricStatus.PENDING,
  },
  {
    id: 'communication',
    skill: 'Clear Communication',
    description: 'Uses clear, jargon-free language and checks for patient understanding.',
    status: RubricStatus.PENDING,
  },
  {
    id: 'procedure',
    skill: 'Correct Procedure',
    description: 'Follows the established protocol for the clinical skill accurately.',
    status: RubricStatus.PENDING,
  },
  {
    id: 'closing',
    skill: 'Closing Summary',
    description: 'Summarizes findings, asks if the patient has questions, and performs hand hygiene.',
    status: RubricStatus.PENDING,
  },
];