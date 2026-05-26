import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { ThemeToggle } from "../components/theme/ThemeToggle";
import { absoluteUrl, siteDescription, siteKeywords, siteName } from "../lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(absoluteUrl()),
  title: {
    default: siteName,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  keywords: siteKeywords,
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/icon.svg",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName,
    title: siteName,
    description: siteDescription,
    locale: "zh_CN",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(() => { try { const key = 'project-web-theme'; const stored = localStorage.getItem(key); const theme = stored || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); document.documentElement.classList.toggle('dark', theme === 'dark'); document.documentElement.style.colorScheme = theme; } catch (_) {} })();",
          }}
        />
        <a className="skip-link" href="#main-content">
          跳到主要内容
        </a>
        <div className="site-shell min-h-screen">
          <header className="site-header">
            <Link className="brand" href="/">
              {siteName}
              <span>记录工程实践、架构思考和发布工作的站点</span>
            </Link>
            <div className="site-header-actions">
              <nav aria-label="主导航">
                <Link href="/">首页</Link>
                <Link href="/articles">文章</Link>
                <Link href="/photos">相册</Link>
                <Link href="/about">关于</Link>
              </nav>
              <ThemeToggle />
            </div>
          </header>
          {children}
          <footer className="site-footer">
            <p>这里是安静的工程手记，不是宣传页。</p>
            <nav aria-label="页脚导航">
              <Link href="/articles">全部文章</Link>
              <Link href="/photos">相册</Link>
              <Link href="/about">关于</Link>
            </nav>
          </footer>
        </div>
      </body>
    </html>
  );
}
