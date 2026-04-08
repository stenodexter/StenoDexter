
import type { Metadata } from "next";
import { requireAdmin } from "~/server/guards";
import { AdminLayoutClient } from "./_components/layout-client";

export const metadata: Metadata = {
  title: "Steno Dexter Admin",
  description: "Admin panel for StenoDexter",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();

  return (
    <AdminLayoutClient admin={admin}>
      {children}
    </AdminLayoutClient>
  );
}