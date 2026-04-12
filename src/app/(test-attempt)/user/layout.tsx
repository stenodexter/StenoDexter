import type { Metadata } from "next";
import { requireUser } from "~/server/guards";

export const metadata: Metadata = {
  title: "Steno Test",
  description: "Test Screen for StenoDexter",
   icons: [
    { rel: "icon", url: "/favicon.ico" },
    { rel: "apple-touch-icon", url: "/icon-192.png" },
  ],
};

export default async function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();

  return <>{children}</>;
}
