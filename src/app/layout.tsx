import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { Toaster } from "@/components/ui/sonner";
import dynamic from "next/dynamic";

const Agentation =
  process.env.NODE_ENV === "development"
    ? dynamic(() => import("agentation").then((m) => ({ default: m.Agentation })))
    : () => null;

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LocalStack UI",
  description: "A web-based dashboard for LocalStack S3 and SQS.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} bg-gray-50 flex h-screen text-slate-800`}
      >
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
        <Toaster />
        <Agentation />
      </body>
    </html>
  );
}
