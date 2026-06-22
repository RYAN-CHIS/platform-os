import { Noto_Serif_SC } from "next/font/google";
import "../globals.css";

const notoSerif = Noto_Serif_SC({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-serif-zh",
});

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className={notoSerif.variable}>
      <body className="min-h-full antialiased bg-[#f8f4ef] text-[#2c2c2c]">
        {children}
      </body>
    </html>
  );
}
