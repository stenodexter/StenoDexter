import "~/styles/globals.css";

import { type Metadata } from "next";
import {
  Geist_Mono,
  Roboto_Slab,
  Inter,
  Montserrat,
  JetBrains_Mono,
  Oxanium, Outfit, Figtree } from "next/font/google";
import Script from "next/script"; // 👈 add this

import { TRPCReactProvider } from "~/trpc/react";
import { TooltipProvider } from "~/components/ui/tooltip";
import { Toaster } from "~/components/ui/sonner";
import { cn } from "~/lib/utils";
import { ThemeProvider } from "~/providers/theme-provider";
import localFont from "next/font/local";

const figtree = Figtree({subsets:['latin'],variable:'--font-sans'});

const calibri = localFont({
  src: [
    {
      path: "../../public/fonts/calibri/Calibri.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/calibri/Calibri-Bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../../public/fonts/calibri/Calibri-Italic.woff2",
      weight: "400",
      style: "italic",
    },
    {
      path: "../../public/fonts/calibri/Calibri-BoldItalic.woff2",
      weight: "700",
      style: "italic",
    },
  ],
  variable: "--font-calibri",
  display: "swap",
});

const robotoSlabHeading = Roboto_Slab({subsets:['latin'],variable:'--font-heading'});

const robotoSlab = Roboto_Slab({
  subsets: ["latin"],
  variable: "--font-serif",
});
const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["800", "900"],
  variable: "--font-montserrat",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Steno Dexter",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
              calibri.variable,
              jetbrainsMono.variable,
              robotoSlab.variable,
              montserrat.variable,
            , "font-sans", figtree.variable, robotoSlabHeading.variable)}
    >
      <body suppressHydrationWarning>
        {" "}
        {/* 👈 add this too */}
        {/* 🔥 Prevent theme flicker — runs before page renders */}
        <Script id="theme-init" strategy="beforeInteractive">
          {`
            (function () {
              try {
                const stored = localStorage.getItem("theme");
                const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                const theme = stored || (systemDark ? "dark" : "light");
                if (theme === "dark") {
                  document.documentElement.classList.add("dark");
                } else {
                  document.documentElement.classList.remove("dark");
                }
              } catch (e) {}
            })();
          `}
        </Script>
        <ThemeProvider>
          <TooltipProvider>
            <TRPCReactProvider>{children}</TRPCReactProvider>
          </TooltipProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
