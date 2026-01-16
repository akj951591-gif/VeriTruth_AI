
export enum Verdict {
  REAL = 'Real',
  FAKE = 'Fake',
  SUSPICIOUS = 'Suspicious',
  MIXED = 'Mixed Context'
}

export interface AnalysisSource {
  title: string;
  url: string;
}

export interface AnalysisResult {
  verdict: Verdict;
  confidence: number;
  explanation: string;
  detectedLanguage: string;
  highlightedClaims: string[];
  suggestedAction: string;
  logicalCrossCheck: string;
  sources?: AnalysisSource[];
}

export interface HistoryItem extends AnalysisResult {
  id: string;
  timestamp: number;
  inputText: string;
}
