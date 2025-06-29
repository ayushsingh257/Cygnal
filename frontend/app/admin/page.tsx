"use client";

import dynamic from "next/dynamic";

// ✅ Dynamically import AdminPanel so it's only rendered client-side
const AdminPanel = dynamic(() => import("@/components/AdminPanel"), {
  ssr: false,
});

export default function AdminPanelPage() {
  return <AdminPanel />;
}
