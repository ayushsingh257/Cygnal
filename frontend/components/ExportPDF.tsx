// /frontend/components/ExportPDF.tsx

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logo from "../assets/cygnal-logo.png";

export async function generatePDF(toolsUsed: {
  headerUsed: boolean;
  whoisUsed: boolean;
  screenshotUsed: boolean;
  metadataUsed: boolean;
  reverseImageUsed: boolean;
}) {
  const doc = new jsPDF();

  // Load logo image as Base64
  const logoImage = await fetch(logo.src)
    .then((res) => res.blob())
    .then(
      (blob) =>
        new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        })
    );

  // Add logo
  doc.addImage(logoImage, "PNG", 10, 10, 30, 30);

  // Title
  doc.setFontSize(20);
  doc.text("Cygnal Scan Report", 50, 20);

  // Timestamp
  const timestamp = new Date().toLocaleString();
  doc.setFontSize(11);
  doc.text(`Generated on: ${timestamp}`, 50, 28);

  // Line below header
  doc.setLineWidth(0.5);
  doc.line(10, 42, 200, 42);

  // Content Section
  doc.setFontSize(13);
  doc.text("Tools Used in This Scan:", 14, 52);

  const rows = Object.entries(toolsUsed)
    .filter(([_, used]) => used)
    .map(([tool]) => [tool.replace(/Used$/, "")]);

  autoTable(doc, {
    startY: 58,
    head: [["Tool"]],
    body: rows.length > 0 ? rows : [["None"]],
  });

  // Save
  doc.save("cygnal_report.pdf");
}
