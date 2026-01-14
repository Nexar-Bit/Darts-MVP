import type { Metadata } from "next";
import "./globals.css";
import ConditionalHeaderFooter from "@/components/layout/ConditionalHeaderFooter";

export const metadata: Metadata = {
  title: "Your App - Welcome",
  description: "Build amazing products with our platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="flex flex-col min-h-screen">
        <ConditionalHeaderFooter>
          <main className="flex-1">{children}</main>
        </ConditionalHeaderFooter>
      </body>
    </html>
  );
}
