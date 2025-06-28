"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import dynamic from "next/dynamic";

const Dashboard = dynamic(() => import("@/components/Dashboard"), {
  ssr: false,
});

export default function DashboardPage() {
  const { user, loadUserFromStorage } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    loadUserFromStorage();
  }, []);

  useEffect(() => {
    if (user && user.role !== "admin") {
      router.push("/"); // redirect non-admins
    }
  }, [user]);

  // Avoid flashing dashboard for non-admins
  if (!user || user.role !== "admin") return null;

  return <Dashboard />;
}
