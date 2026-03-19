import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Xaman Brazil Tax Center",
  description: "Assistente fiscal para XRPL/Xahau em portuguÃªs brasileiro"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className="min-h-full bg-transparent">
      <body className="min-h-full bg-transparent text-fg antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

