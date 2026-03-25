import type { Metadata } from "next";
import { requireUser } from "~/server/guards";
import { SidebarProvider, SidebarInset } from "~/components/ui/sidebar";
import { UserNavbar } from "~/components/common/user/navbar";
import { UserSidebar } from "~/components/common/user/sidebar";
import { SubscriptionGate } from "./_components/subcription-gate";

export const metadata: Metadata = {
  title: "Steno Dexter",
  description: "User panel for StenoDexter",
};

export default async function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <SubscriptionGate>
      <SidebarProvider>
        <UserSidebar />
        <SidebarInset>
          <UserNavbar user={user} />
          <main className="flex flex-1 flex-col gap-4 p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </SubscriptionGate>
  );
}
