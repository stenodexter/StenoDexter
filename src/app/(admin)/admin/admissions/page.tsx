// ─── app/admin/admissions/page.tsx ───────────────────────────────────────────

import type { Metadata } from "next";
import { AdmissionsList } from "./_components/list-client";

export const metadata: Metadata = {
  title: "Admissions — Admin",
  description: "Review and manage student payment submissions.",
};

export default function AdminAdmissionsPage() {
  return (
    <div className="flex flex-col gap-6 px-6 py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admissions</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Review payment submissions and manage student access.
        </p>
      </div>
      <AdmissionsList />
    </div>
  );
}
