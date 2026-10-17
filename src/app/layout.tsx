import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "SPS · Registration & Offers",
  description:
    "UTeM School of Graduate Studies staff registration and conditional offers",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
