import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

/**
 * Metadata for the application, used by Next.js for SEO and head tags.
 */
export const metadata: Metadata = {
  title: "Phòng Nghe Nhạc Chung",
  description: "Nghe nhạc cùng bạn bè",
};

/**
 * The root layout component that wraps all pages in the application.
 * Configures the font, global styles, and toast notifications.
 *
 * @param props - The component props.
 * @param props.children - The child components to render (the active page).
 * @returns The rendered HTML structure.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Toaster position="top-right" />
        {children}
      </body>
    </html>
  );
}
