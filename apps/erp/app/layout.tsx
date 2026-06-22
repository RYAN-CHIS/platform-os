import Sidebar from "@/components/layout/Sidebar";
import SessionProvider from "@/components/auth/SessionProvider";
import { Noto_Serif_SC } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";

const notoSerif = Noto_Serif_SC({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-serif-zh",
});

// 页面标题（浏览器标签页显示）
const APP_TITLE = "允物 · 品牌经营系统";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={`h-full ${notoSerif.variable}`}>
      <head>
        <title>{APP_TITLE}</title>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body className="min-h-full antialiased bg-[#f8f4ef] text-[#2c2c2c]">
        <SessionProvider>
          <Suspense fallback={null}>
            <Sidebar />
          </Suspense>
          <main className="lg:pl-64 min-h-screen">{children}</main>
        </SessionProvider>
      </body>
    </html>
  );
}
