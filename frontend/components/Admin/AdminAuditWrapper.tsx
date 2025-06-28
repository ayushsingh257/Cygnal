"use client";

import dynamic from "next/dynamic";

// Move dynamic import into a client component
const AuditTrailViewer = dynamic(() => import("./AuditTrailViewer"), {
  ssr: false,
});

export default function AdminAuditWrapper() {
  return <AuditTrailViewer />;
}
