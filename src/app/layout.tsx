import "./globals.css";
import { Metadata } from "next";
import { Sora, Manrope } from "next/font/google";
import { AuthProvider } from "@/lib/auth";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"]
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"]
});

export const metadata: Metadata = {
  title: "FII-Portfolio",
  description: "Controle e análise de carteira de FIIs"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${sora.variable} ${manrope.variable} font-[var(--font-body)]`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
