// /frontend/store/useReportStore.ts

import { create } from "zustand";

type ToolKeys =
  | "headerUsed"
  | "whoisUsed"
  | "screenshotUsed"
  | "metadataUsed"
  | "reverseImageUsed";

interface ReportState {
  headerUsed: boolean;
  whoisUsed: boolean;
  screenshotUsed: boolean;
  metadataUsed: boolean;
  reverseImageUsed: boolean;
  setToolUsed: (tool: ToolKeys) => void;
  resetAll: () => void;
}

export const useReportStore = create<ReportState>((set) => ({
  headerUsed: false,
  whoisUsed: false,
  screenshotUsed: false,
  metadataUsed: false,
  reverseImageUsed: false,

  setToolUsed: (tool: ToolKeys) =>
    set((state) => {
      return {
        ...state,
        [tool]: true,
      };
    }),

  resetAll: () =>
    set(() => ({
      headerUsed: false,
      whoisUsed: false,
      screenshotUsed: false,
      metadataUsed: false,
      reverseImageUsed: false,
    })),
}));
