import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Document",
  description: "Document from STENO DEXTER",
};

export default async function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
