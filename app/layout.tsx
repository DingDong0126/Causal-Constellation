import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "因果星图",
  description: "Causal Constellation - 与 AI 协作共建的人生因果图",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
