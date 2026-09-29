export type Urgency = 'high' | 'medium' | 'low';

export interface LensResult {
  doc_type: string;
  title: string;
  issuer: string;
  original_language: string;
  summary: string;
  key_facts: { label: string; value: string }[];
  /** `approximate`: computed from a rule plus a printed base date, not itself printed. Missing on scans saved before the field existed. */
  deadlines: { date: string; what: string; approximate?: boolean }[];
  actions: { step: string; urgency: Urgency }[];
  warnings: string[];
  glossary: { term: string; meaning: string }[];
  /** Missing on scans saved before the field existed. */
  payment?: { method: string; code: string };
  confidence: Urgency;
  unclear_parts: string[];
}

export interface ChatTurn {
  role: 'user' | 'model';
  text: string;
}

export interface Scan {
  id: string;
  createdAt: number;
  language: string;
  imageUri: string; // local file only, never uploaded for storage
  result: LensResult;
  chat: ChatTurn[];
  reminderIds: string[];
}
