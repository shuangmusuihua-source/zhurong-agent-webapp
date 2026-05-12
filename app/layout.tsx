import type { Metadata } from "next";
import localFont from "next/font/local";
import { JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";

const alibabaPuHuiTi = localFont({
  src: [
    {
      path: "../public/fonts/AlibabaPuHuiTi-3-55-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/AlibabaPuHuiTi-3-65-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/AlibabaPuHuiTi-3-75-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
  ],
  variable: "--font-puhuiti",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "大象Agent",
  description: "AI 智能助手",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning className={`${alibabaPuHuiTi.variable} ${jetbrainsMono.variable}`}>
      <head>
        <link rel="stylesheet" href="/fonts/dingtalk-jinbuti/font.css" />
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
