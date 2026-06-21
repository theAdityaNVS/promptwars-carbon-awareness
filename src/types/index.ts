export type Category = 'transport' | 'diet' | 'energy';

export type TransportMode = 'car_solo' | 'car_shared' | 'bus' | 'train' | 'bike' | 'walk' | 'ev';

export interface LogEntry {
  id: string;
  date: string; // ISO string (e.g. YYYY-MM-DD)
  category: Category;
  subtype: string; // TransportMode | meal type | energy unit
  quantity: number;
  unit: string;
  description?: string;
}

export interface UserBaseline {
  commuteMode: TransportMode;
  commuteKmPerWeek: number;
  dietPattern: string; // 'high_meat' | 'low_meat' | 'veg'
  kwhPerWeek: number;
}

export interface Insight {
  id: string;
  category: Category;
  severity: 'info' | 'tip' | 'warning';
  message: string;
  estimatedImpactKg: number;
  relatedAction?: Partial<LogEntry>;
}

export interface AssistantResponse {
  insights: Insight[];
  source: 'rules' | 'rules+llm';
}
