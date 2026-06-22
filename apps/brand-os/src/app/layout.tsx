import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "@/styles/globals.css";
import "@/styles/tokens.css";

export const metadata: Metadata = {
  title: "允物 Brand OS",
  description: "允物品牌操作系统",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
