import type { Metadata } from "next";
import { Bricolage_Grotesque, Inter, Geist_Mono, Geist } from "next/font/google";
import { site } from "@/lib/site";
import "./globals.css";
import { cn } from "@/lib/utils";
import { PrivyProviderWrapper } from "@/components/PrivyProviderWrapper";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage" });
const sans = Inter({ subsets: ["latin"], variable: "--font-inter" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: `${site.name} | Ads that work`,
  description: "A web3 ad platform where sponsors fund campaigns and creators earn on-chain.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn(display.variable, sans.variable, mono.variable, "font-sans", geist.variable)}>
      <body>
        <PrivyProviderWrapper>{children}</PrivyProviderWrapper>
      </body>
    </html>
  );
}