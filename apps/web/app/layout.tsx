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
        <a
          className="fixed left-3 top-3 z-20 -translate-y-[140%] rounded-md border border-[var(--rule)] bg-[var(--surface)] px-3 py-2.5 text-sm font-bold text-[var(--ink)] transition-transform focus:translate-y-0"
          href="#main-content"
        >
          跳到主要内容
        </a>
        <div className="mx-auto min-h-screen w-[min(calc(100%_-_40px),100%)] pb-14 pt-5 max-[720px]:w-[min(calc(100%_-_28px),100%)] max-[720px]:pt-3.5">
          <header className="flex min-h-[60px] items-center justify-between gap-[18px] border-b border-[var(--rule)] pb-4 max-[720px]:grid max-[720px]:grid-cols-1 max-[720px]:items-start">
            <Link
              className="grid gap-[3px] border-l-[3px] border-[var(--accent)] pl-3 font-bold leading-tight text-[var(--ink)]"
              href="/"
            >
              {siteName}
              <span className="text-xs font-medium text-[var(--soft)]">记录工程实践、架构思考和发布工作的站点</span>
            </Link>
            <div className="flex min-w-0 items-center justify-end gap-3 max-[720px]:grid max-[720px]:justify-stretch">
              <nav className="-ml-0 flex flex-wrap items-center gap-1 max-[720px]:-ml-2.5" aria-label="主导航">
                <Link className="inline-flex min-h-10 items-center rounded-sm px-2.5 text-sm text-[var(--muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--ink)]" href="/">
                  首页
                </Link>
                <Link className="inline-flex min-h-10 items-center rounded-sm px-2.5 text-sm text-[var(--muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--ink)]" href="/articles">
                  文章
                </Link>
                <Link className="inline-flex min-h-10 items-center rounded-sm px-2.5 text-sm text-[var(--muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--ink)]" href="/photos">
                  相册
                </Link>
                <Link className="inline-flex min-h-10 items-center rounded-sm px-2.5 text-sm text-[var(--muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--ink)]" href="/about">
                  关于
                </Link>
              </nav>
              <ThemeToggle />
            </div>
          </header>
          {children}
          <footer className="mt-[76px] flex items-center justify-between gap-[18px] border-t border-[var(--rule)] pt-[22px] text-sm text-[var(--muted)] max-[720px]:grid max-[720px]:grid-cols-1 max-[720px]:items-start">
            <p className="m-0">这里是安静的工程手记，不是宣传页。</p>
            <nav className="-ml-0 flex flex-wrap items-center gap-1 max-[720px]:-ml-2.5" aria-label="页脚导航">
              <Link className="inline-flex min-h-10 items-center rounded-sm px-2.5 text-sm text-[var(--muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--ink)]" href="/articles">
                全部文章
              </Link>
              <Link className="inline-flex min-h-10 items-center rounded-sm px-2.5 text-sm text-[var(--muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--ink)]" href="/photos">
                相册
              </Link>
              <Link className="inline-flex min-h-10 items-center rounded-sm px-2.5 text-sm text-[var(--muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--ink)]" href="/about">
                关于
              </Link>
            </nav>
          </footer>
        </div>
      </body>
    </html>
  );
}
