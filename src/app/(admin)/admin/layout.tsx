import type { Metadata } from "next";
import { requireAdmin } from "~/server/guards";
import { SidebarProvider, SidebarInset } from "~/components/ui/sidebar";
import { AdminNavbar } from "~/components/common/admin/navbar";
import { AdminSidebar } from "~/components/common/admin/sidebar";

export const metadata: Metadata = {
  title: "StenoDexter Admin",
  description: "Admin panel for StenoDexter",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <AdminNavbar admin={admin} />
        <main className="flex flex-1 flex-col gap-4 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
