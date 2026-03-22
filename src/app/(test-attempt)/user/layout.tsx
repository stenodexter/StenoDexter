import type { Metadata } from "next";
import { requireUser } from "~/server/guards";

export const metadata: Metadata = {
  title: "Steno Test",
  description: "Test Screen for StenoDexter",
};

export default async function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();

  return <>{children}</>;
}
