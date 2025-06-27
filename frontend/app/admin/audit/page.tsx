// ✅ frontend/app/admin/audit/page.tsx
import dynamic from "next/dynamic";

const AuditTrailViewer = dynamic(() => import("@/components/Admin/AuditTrailViewer"), {
  ssr: false,
});

export default function AdminAuditPage() {
  return <AuditTrailViewer />;
}
