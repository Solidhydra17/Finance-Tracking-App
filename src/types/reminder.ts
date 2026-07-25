export interface Reminder {
  id: string; // uuid or timestamp string
  label: string;
  days: number[]; // 0=Sun, 1=Mon, ... 6=Sat
  time: string;   // "HH:MM" 24h
  enabled: boolean;
}
