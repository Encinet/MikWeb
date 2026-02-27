import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mik Casual",
  description: "Minecraft Server",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
