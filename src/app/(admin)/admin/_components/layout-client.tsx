"use client";

import { SidebarProvider, SidebarInset } from "~/components/ui/sidebar";
import { AdminNavbar } from "~/components/common/admin/navbar";
import { AdminSidebar } from "~/components/common/admin/sidebar";
import { useLocalStorage } from "~/hooks/use-local-storage";

type Props = {
  children: React.ReactNode;
  admin: Awaited<ReturnType<typeof import("~/server/guards").requireAdmin>>;
};

export function AdminLayoutClient({ children, admin }: Props) {
  const [isOpen, setIsOpen] = useLocalStorage<boolean>("sidebar-open", true);

  return (
    <SidebarProvider open={isOpen} onOpenChange={() => setIsOpen((p) => !p)}>
      <AdminSidebar />
      <SidebarInset>
        <AdminNavbar admin={admin} />
        <main className="flex flex-1 flex-col gap-4 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
