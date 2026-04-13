import type { Metadata } from "next";
import { Logo } from "~/components/utils/logo";
import { ThemeToggle } from "~/components/utils/theme-toggle";
import { WavesBg } from "~/components/utils/background/waves-bg";

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
    <div className="relative max-h-screen overflow-hidden">
      <div className="absolute top-0 left-0 flex w-full items-center justify-between p-4">
        <Logo />
        <ThemeToggle />
      </div>

      {/* <DoodleBg
        stroke="#BFC9D1" // light mode color
        opacity={0.22}
        tileSize={200} // smaller = more tiles = denser
      /> */}

      {/* gradient */}
      {/* <div className="bg-mesh absolute inset-0 z-0 opacity-25" /> */}

      {/* dots */}

      {/* <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `radial-gradient(circle, #cbd5e1 1px, transparent 1px)`,
          backgroundSize: "28px 28px",
          opacity: 0.5,
        }}
      /> */}

      {/* <div className="absolute inset-0 z-0 overflow-hidden">
        <svg
          className="absolute bottom-0 w-full"
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill="rgba(99,102,241,0.08)"
            d="M0,160L60,170.7C120,181,240,203,360,186.7C480,171,600,117,720,112C840,107,960,149,1080,165.3C1200,181,1320,171,1380,165.3L1440,160L1440,320L0,320Z"
          />
          <path
            fill="rgba(99,102,241,0.05)"
            d="M0,224L60,218.7C120,213,240,203,360,208C480,213,600,235,720,229.3C840,224,960,192,1080,181.3C1200,171,1320,181,1380,186.7L1440,192L1440,320L0,320Z"
          />
        </svg>
      </div> */}

      {/* BLOBS */}
      {/* <>
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-purple-300 opacity-20 blur-3xl dark:bg-purple-900" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-blue-300 opacity-20 blur-3xl dark:bg-blue-900" />
      </> */}

      <WavesBg />

      {children}
    </div>
  );
}
