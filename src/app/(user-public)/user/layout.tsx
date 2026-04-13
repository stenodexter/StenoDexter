import type { Metadata } from "next";
import { DoodleBg } from "~/components/utils/doodle-bg";
import { Logo } from "~/components/utils/logo";
import { ThemeToggle } from "~/components/utils/theme-toggle";

export const metadata: Metadata = {
  title: "Steno Dexter User",
  description: "User panel for StenoDexter",
  icons: [
    { rel: "icon", url: "/favicon.ico" },
    { rel: "apple-touch-icon", url: "/steno.png" },
  ],
};

export default async function AdminAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen">
      <div className="absolute top-0 left-0 flex w-full items-center justify-between p-4">
        <span className="relative z-30">
          <Logo />
        </span>
        <span className="relative z-30">
          <ThemeToggle />
        </span>
      </div>

      <DoodleBg
        stroke="#BFC9D1" // light mode color
        opacity={0.22}
        tileSize={200} // smaller = more tiles = denser
      />

      {children}
    </div>
  );
}
