import { useEffect, useRef, useCallback } from "react";
import type { AnchorHTMLAttributes } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import mermaid from "mermaid";
import { Prose } from "@/components/ui/prose";

mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  securityLevel: "loose",
});

let mermaidCounter = 0;

function MermaidBlock({ children }: { children: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  const render = useCallback(async () => {
    if (!containerRef.current) return;
    const id = `mermaid-${++mermaidCounter}`;
    const { svg } = await mermaid.render(id, children.trim());
    containerRef.current.innerHTML = svg;
  }, [children]);

  useEffect(() => {
    void render();
  }, [render]);

  return <div ref={containerRef} />;
}

interface MarkdownViewerProps {
  content: string;
}

function AnchorLink(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const { href, children, ...rest } = props;
  if (href?.startsWith("#")) {
    return (
      <a
        {...rest}
        href={href}
        onClick={(e) => {
          e.preventDefault();
          const id = href.slice(1);
          const el = document.getElementById(id);
          if (!el) return;
          // Push a history entry so back/forward navigates between anchors
          history.pushState(null, "", href);
          el.scrollIntoView({ behavior: "smooth" });
        }}
      >
        {children}
      </a>
    );
  }
  return (
    <a {...rest} href={href}>
      {children}
    </a>
  );
}

function useHashScroll() {
  useEffect(() => {
    function onPopState() {
      const hash = window.location.hash.slice(1);
      if (hash) {
        document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
}

export function MarkdownViewer({ content }: MarkdownViewerProps) {
  useHashScroll();
  return (
    <Prose>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug]}
        components={{
          a: AnchorLink,
          code({ className, children }) {
            if (className === "language-mermaid") {
              return <MermaidBlock>{String(children)}</MermaidBlock>;
            }
            return <code className={className}>{children}</code>;
          },
          pre({ children }) {
            return <>{children}</>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </Prose>
  );
}
