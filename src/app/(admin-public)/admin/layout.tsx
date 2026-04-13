import type { Metadata } from "next";
import { WavesBgAmber } from "~/components/utils/background/waves-amber-bg";
import { Logo } from "~/components/utils/logo";
import { ThemeToggle } from "~/components/utils/theme-toggle";

export const metadata: Metadata = {
  title: "Steno Dexter Admin",
  description: "Admin panel for StenoDexter",
};

export default async function AdminAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen overflow-hidden">
      <div className="absolute z-40 top-0 left-0 flex w-full items-center justify-between p-4">
        <Logo />
        <ThemeToggle />
      </div>

      <WavesBgAmber />
      {children}
    </div>
  );
}
