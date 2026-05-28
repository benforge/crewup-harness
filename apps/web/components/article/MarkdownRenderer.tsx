import Link from "next/link";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

type MarkdownRendererProps = {
  body: string;
};

function getText(children: unknown): string {
  if (typeof children === "string") return children;
  if (Array.isArray(children)) return children.map(getText).join("");
  if (children && typeof children === "object" && "props" in children) {
    const props = (children as { props?: { children?: unknown } }).props;
    return getText(props?.children);
  }
  return "";
}

function slugifyHeading(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[`~!@#$%^&*()+=[\]{};:'",.<>/?\\|]/g, "")
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isExternalHref(href: string) {
  return /^https?:\/\//i.test(href);
}

const components: Components = {
  a({ children, href = "", ...props }) {
    if (!href) return <span>{children}</span>;
    if (isExternalHref(href)) {
      return (
        <a href={href} rel="noopener noreferrer" target="_blank" {...props}>
          {children}
        </a>
      );
    }
    return <Link href={href}>{children}</Link>;
  },
  code({ children, className, ...props }) {
    const match = /language-([a-z0-9_-]+)/i.exec(className ?? "");
    const language = match?.[1];

    return (
      <code className={className} data-language={language} {...props}>
        {children}
      </code>
    );
  },
  h2({ children, ...props }) {
    const id = slugifyHeading(getText(children));
    return (
      <h2 id={id} {...props}>
        {children}
      </h2>
    );
  },
  h3({ children, ...props }) {
    const id = slugifyHeading(getText(children));
    return (
      <h3 id={id} {...props}>
        {children}
      </h3>
    );
  },
  img({ alt, src, ...props }) {
    if (!src) return null;
    return <img alt={alt || "Article image"} decoding="async" loading="lazy" src={src} {...props} />;
  },
  pre({ children, ...props }) {
    const language = getText(children).match(/^([a-z0-9_-]+)\n/i)?.[1];
    return (
      <pre data-language={language} {...props}>
        {children}
      </pre>
    );
  },
  table({ children, ...props }) {
    return (
      <div className="markdown-table-wrap">
        <table {...props}>{children}</table>
      </div>
    );
  },
};

export function MarkdownRenderer({ body }: MarkdownRendererProps) {
  return (
    <div className="markdown-body">
      <ReactMarkdown components={components} remarkPlugins={[remarkGfm]}>
        {body}
      </ReactMarkdown>
    </div>
  );
}
