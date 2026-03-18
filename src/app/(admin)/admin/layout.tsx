import type { Metadata } from "next";
import { requireAdmin } from "~/server/guards";
import { api } from "~/trpc/server";

export const metadata: Metadata = {
  title: "StenoDexter Admin",
  description: "Admin panel for StenoDexter",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return <>{children}</>;
}
