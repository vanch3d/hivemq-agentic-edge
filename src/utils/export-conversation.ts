/**
 * Convert a chat conversation (UIMessage[]) to a Markdown document.
 *
 * Pure function — no React or DOM dependencies.
 */
import type { UIMessage } from "@tanstack/ai";

interface ExportOptions {
  model?: string | null;
}

/**
 * Convert an array of objects to a Markdown table.
 * Returns undefined if the data isn't suitable for tabular display.
 */
function toMarkdownTable(data: unknown): string | undefined {
  if (!Array.isArray(data) || data.length === 0) return undefined;
  const first = data[0];
  if (typeof first !== "object" || first === null) return undefined;

  const keys = Object.keys(first as Record<string, unknown>);
  if (keys.length === 0) return undefined;

  const header = `| ${keys.join(" | ")} |`;
  const separator = `| ${keys.map(() => "---").join(" | ")} |`;
  const rows = data.map((row: unknown) => {
    const r = row as Record<string, unknown>;
    return `| ${keys.map((k) => String(r[k] ?? "")).join(" | ")} |`;
  });

  return [header, separator, ...rows].join("\n");
}

/**
 * Format a tool-result part's JSON content into readable Markdown.
 */
function formatToolResult(content: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return `> ${content}`;
  }

  const result = parsed as {
    data?: unknown;
    error?: string;
    summary?: string;
    display?: string;
    snapshotId?: string;
  };

  const lines: string[] = [];

  if (result.error) {
    lines.push(`> **Error**: ${result.error}`);
    return lines.join("\n");
  }

  if (result.summary) {
    lines.push(`> ${result.summary}`);
  }

  if (result.display === "graph") {
    lines.push("> *Graph visualization*");
  } else if (result.data !== undefined) {
    const table = toMarkdownTable(result.data);
    if (table) {
      lines.push("", table, "");
    } else if (
      typeof result.data === "object" &&
      result.data !== null
    ) {
      lines.push("", "```json", JSON.stringify(result.data, null, 2), "```", "");
    }
  }

  if (result.snapshotId) {
    lines.push(
      `> [View full result](/workspace/snapshot/${result.snapshotId})`,
    );
  }

  return lines.join("\n");
}

export function messagesToMarkdown(
  messages: UIMessage[],
  options: ExportOptions = {},
): string {
  const sections: string[] = [];

  // Header
  sections.push("# Conversation Export");
  sections.push("");
  sections.push(`- **Date**: ${new Date().toISOString()}`);
  if (options.model) {
    sections.push(`- **Model**: ${options.model}`);
  }
  sections.push("");

  for (const message of messages) {
    if (message.role === "system") continue;

    const isUser = message.role === "user";
    const heading = isUser ? "## User" : "## Assistant";

    const partLines: string[] = [];

    for (const part of message.parts) {
      switch (part.type) {
        case "text":
          if (part.content.trim()) {
            partLines.push(part.content);
          }
          break;

        case "tool-call":
          partLines.push(`> **Tool**: \`${part.name}\``);
          break;

        case "tool-result":
          if (part.error) {
            partLines.push(`> **Error**: ${part.error}`);
          } else if (part.content) {
            partLines.push(formatToolResult(part.content));
          }
          break;

        case "thinking":
          if (part.content.trim()) {
            partLines.push(
              "<details>",
              "<summary>Thinking</summary>",
              "",
              part.content,
              "",
              "</details>",
            );
          }
          break;
      }
    }

    // Only emit the section if there's visible content
    if (partLines.length > 0) {
      sections.push("---", "", heading, "");
      sections.push(partLines.join("\n\n"));
      sections.push("");
    }
  }

  return sections.join("\n");
}
