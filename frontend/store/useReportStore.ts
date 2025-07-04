// /frontend/store/useReportStore.ts

import { create } from "zustand";

type ToolKeys =
  | "headerUsed"
  | "whoisUsed"
  | "screenshotUsed"
  | "metadataUsed"
  | "reverseImageUsed"
  | "emailUsed"
  | "malwareUsed"
  | "ipReputationUsed"   // ✅ Phase 28
  | "passiveDNSUsed"     // ✅ Phase 29
  | "portScanUsed";      // ✅ Phase 30

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
  emailUsed: boolean;
  malwareUsed: boolean;
  ipReputationUsed: boolean;  // ✅ Phase 28
  passiveDNSUsed: boolean;    // ✅ Phase 29
  portScanUsed: boolean;      // ✅ Phase 30

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
  emailUsed: false,
  malwareUsed: false,
  ipReputationUsed: false,
  passiveDNSUsed: false,
  portScanUsed: false, // ✅ Init

  scanHistory: [],

  addToHistory: (entry) =>
    set((state) => ({
      scanHistory: [
        {
          ...entry,
          timestamp: new Date().toISOString(),
        },
        ...state.scanHistory.slice(0, 49),
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
      emailUsed: false,
      malwareUsed: false,
      ipReputationUsed: false,
      passiveDNSUsed: false,
      portScanUsed: false, // ✅ Reset
    })),
}));
