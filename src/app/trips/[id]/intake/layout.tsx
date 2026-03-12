import { Outfit } from "next/font/google";
import "./intake.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["500", "800", "900"],
});

export default function IntakeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className={outfit.variable}>{children}</div>;
}
