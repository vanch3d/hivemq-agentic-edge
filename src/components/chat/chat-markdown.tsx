import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prose } from "@/components/ui/prose";

export function ChatMarkdown({ content }: { content: string }) {
  return (
    <Prose css={chatProseOverrides}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </Prose>
  );
}

const chatProseOverrides = {
  fontSize: "sm",
  lineHeight: "tall",
  maxWidth: "none",
  "& h1, & h2, & h3, & h4": {
    fontSize: "sm",
    fontWeight: "bold",
    mt: 2,
    mb: 1,
  },
  "& p": { mt: 0, mb: 1.5 },
  "& p:last-child": { mb: 0 },
  "& ul, & ol": { mt: 0, mb: 1.5, pl: 4 },
  "& li": { mb: 0.5 },
  "& pre": {
    fontSize: "xs",
    p: 2,
    borderRadius: "md",
    overflowX: "auto",
  },
  "& code:not(pre code)": {
    fontSize: "xs",
    px: 1,
    py: 0.5,
    borderRadius: "sm",
    bg: "bg.subtle",
  },
  "& table": { fontSize: "xs" },
  "& blockquote": { pl: 3, borderLeftWidth: "2px", my: 1.5 },
};
