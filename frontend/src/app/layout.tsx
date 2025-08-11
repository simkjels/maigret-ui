import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import Script from "next/script";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Maigret OSINT Tool",
  description: "Modern OSINT tool for discovering digital footprints across 3000+ websites",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const resolvedThemeCookie = cookieStore.get("maigret-theme-resolved")?.value;
  const selectedThemeCookie = cookieStore.get("maigret-theme")?.value;
  const initialHtmlClass =
    resolvedThemeCookie === "dark" || selectedThemeCookie === "dark" ? "dark" : "";
  return (
    <html lang="en" className={initialHtmlClass} suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="dark light" />
        <style
          // This inline style prevents white flash before Tailwind CSS loads
          dangerouslySetInnerHTML={{
            __html:
              "html.dark{background-color:#0b0b0b;} html{color-scheme: light dark;}",
          }}
        />
        <Script id="theme-init" strategy="beforeInteractive">
          {`
            (function() {
              try {
                var stored = localStorage.getItem('maigret-theme');
                var systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                var theme = stored || 'system';
                var useDark = theme === 'dark' || (theme === 'system' && systemDark);
                var c = document.documentElement.classList;
                if (useDark) c.add('dark'); else c.remove('dark');
                try {
                  document.cookie = 'maigret-theme=' + theme + '; path=/; max-age=31536000';
                  document.cookie = 'maigret-theme-resolved=' + (useDark ? 'dark' : 'light') + '; path=/; max-age=31536000';
                } catch(e) {}
              } catch (e) {}
            })();
          `}
        </Script>
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased font-sans`}>
        <ThemeProvider defaultTheme="system">
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
