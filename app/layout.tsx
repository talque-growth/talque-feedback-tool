import type { Metadata } from "next";
import "./globals.css";
import { Topbar } from "@/components/Topbar";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "talque · Post-Event-Feedback",
  description:
    "Internes Tool zur Erfassung von Post-Event-Feedback nach Krisp-Calls",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Topbar />
        <main>{children}</main>
        <Toaster position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}
