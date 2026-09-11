import { CoupleGate } from "@/components/CoupleGate";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <CoupleGate>{children}</CoupleGate>;
}
