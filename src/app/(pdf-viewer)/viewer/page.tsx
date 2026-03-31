// app/(pdf-viewer)/viewer/page.tsx
"use client";

import dynamic from "next/dynamic";

const SecurePdfViewer = dynamic(
  () => import("./_components/secure-pdf-viewer"),
  {
    ssr: false, // ← this is the key fix
    loading: () => null,
  },
);

export default function ViewerPage() {
  return <SecurePdfViewer />;
}
