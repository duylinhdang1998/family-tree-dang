import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import config from "./config";
import "./globals.css";

// Space Grotesk: font hiển thị/UI chính (heading + body). Hỗ trợ tiếng Việt.
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin", "latin-ext", "vietnamese"],
  variable: "--font-space",
});
// JetBrains Mono: code, badge, nav label, micro-copy. Hỗ trợ tiếng Việt.
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "latin-ext", "vietnamese"],
  variable: "--font-jetbrains",
});
export const metadata: Metadata = {
  title: config.siteName,
  description: config.siteName,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body
        className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} font-sans antialiased relative`}
      >
        {children}
      </body>
    </html>
  );
}
