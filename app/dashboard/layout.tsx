import type * as React from "react";
import { redirect } from "next/navigation";

import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { getAuthContext } from "@/lib/auth/context";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar title="Dashboard" email={ctx.email} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
