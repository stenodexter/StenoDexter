import type { Metadata } from "next";
import { Logo } from "~/components/utils/logo";
import { ThemeToggle } from "~/components/utils/theme-toggle";

export const metadata: Metadata = {
  title: "Steno Dexter User",
  description: "User panel for StenoDexter",
  icons: [
    { rel: "icon", url: "/favicon.ico" },
    { rel: "apple-touch-icon", url: "/icon-192.png" },
  ],
};

export default async function AdminAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="absolute top-0 left-0 flex w-full items-center justify-between p-4">
        <Logo />
        <ThemeToggle />
      </div>
      {children}
    </>
  );
}
