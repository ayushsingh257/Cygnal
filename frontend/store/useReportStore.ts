// /frontend/store/useReportStore.ts

import { create } from "zustand";

type ToolKeys =
  | "headerUsed"
  | "whoisUsed"
  | "screenshotUsed"
  | "metadataUsed"
  | "reverseImageUsed"
  | "emailUsed"; // ✅ Added for Email Scanner

interface ScanEntry {
  tool: string;
  input: string;
  result?: any;
  timestamp: string;
}

interface ReportState {
  headerUsed: boolean;
  whoisUsed: boolean;
  screenshotUsed: boolean;
  metadataUsed: boolean;
  reverseImageUsed: boolean;
  emailUsed: boolean; // ✅ Added

  scanHistory: ScanEntry[];
  addToHistory: (entry: Omit<ScanEntry, "timestamp">) => void;
  clearHistory: () => void;

  setToolUsed: (tool: ToolKeys) => void;
  resetAll: () => void;
}

export const useReportStore = create<ReportState>((set) => ({
  headerUsed: false,
  whoisUsed: false,
  screenshotUsed: false,
  metadataUsed: false,
  reverseImageUsed: false,
  emailUsed: false, // ✅ Added

  scanHistory: [],

  addToHistory: (entry) =>
    set((state) => ({
      scanHistory: [
        {
          ...entry,
          timestamp: new Date().toISOString(),
        },
        ...state.scanHistory.slice(0, 49), // keep max 50 entries
      ],
    })),

  clearHistory: () => set(() => ({ scanHistory: [] })),

  setToolUsed: (tool: ToolKeys) =>
    set((state) => ({
      ...state,
      [tool]: true,
    })),

  resetAll: () =>
    set(() => ({
      headerUsed: false,
      whoisUsed: false,
      screenshotUsed: false,
      metadataUsed: false,
      reverseImageUsed: false,
      emailUsed: false, // ✅ Reset
    })),
}));
