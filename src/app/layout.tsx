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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          id="sps-theme-init"
          dangerouslySetInnerHTML={{
            __html: `(()=>{const m=matchMedia('(prefers-color-scheme: dark)');const apply=()=>{let p='system';try{p=localStorage.getItem('sps-theme')||'system'}catch{}const t=p==='light'||p==='dark'?p:m.matches?'dark':'light';document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t};apply();m.addEventListener('change',apply);addEventListener('storage',apply)})()`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
