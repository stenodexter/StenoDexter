import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Document",
  description: "Document from STENO DEXTER",
  icons: [
    { rel: "icon", url: "/favicon.ico" },
    { rel: "apple-touch-icon", url: "/steno.png" },
  ],
};

export default async function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
