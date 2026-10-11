import type { Metadata } from "next";
import PublicShell from "../../components/public/PublicShell";

export const metadata: Metadata = {
  title: "SB Liloan — Public legislative records",
  description: "Search ordinances and resolutions of the Sangguniang Bayan ng Liloan, Southern Leyte",
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <PublicShell>{children}</PublicShell>;
}
