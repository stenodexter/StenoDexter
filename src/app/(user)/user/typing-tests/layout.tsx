import { TypingTestGate } from "../_components/subcription-gate";

export default function TypingTestsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <TypingTestGate>{children}</TypingTestGate>;
}
