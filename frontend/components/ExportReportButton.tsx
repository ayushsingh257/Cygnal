// /frontend/components/ExportReportButton.tsx

"use client";

import { useReportStore } from "@/store/useReportStore";
import { generatePDF } from "./ExportPDF";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function ExportReportButton() {
  const {
    headerUsed,
    whoisUsed,
    screenshotUsed,
    metadataUsed,
    reverseImageUsed,
  } = useReportStore();

  const handleExport = () => {
    const anyToolUsed =
      headerUsed ||
      whoisUsed ||
      screenshotUsed ||
      metadataUsed ||
      reverseImageUsed;

    if (!anyToolUsed) {
      toast.warning("No tools used yet. Please run at least one scan.");
      return;
    }

    generatePDF({
      headerUsed,
      whoisUsed,
      screenshotUsed,
      metadataUsed,
      reverseImageUsed,
    });
  };

  return (
    <div className="my-6 flex justify-center">
      <Button
        onClick={handleExport}
        className="bg-cyan-700 hover:bg-cyan-800 text-white px-6 py-3 rounded-xl text-lg"
      >
        📄 Export Full Report
      </Button>
    </div>
  );
}
