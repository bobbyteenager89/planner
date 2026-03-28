import { Outfit } from "next/font/google";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["500", "800", "900"],
});

export default function ShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className={outfit.variable}>{children}</div>;
}
