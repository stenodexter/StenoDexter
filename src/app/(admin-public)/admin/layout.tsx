import type { Metadata } from "next";
import { ThemeToggle } from "~/components/utils/theme-toggle";

export const metadata: Metadata = {
  title: "StenoDexter Admin",
  description: "Admin panel for StenoDexter",
};

export default async function AdminAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="absolute top-0 left-0 flex w-full items-center justify-between p-4">
        <h3 className="font-logo tracking-tight">
          STENO<span className="text-primary"> DEXTER</span>
        </h3>
        <ThemeToggle />
      </div>
      {children}
    </>
  );
}
