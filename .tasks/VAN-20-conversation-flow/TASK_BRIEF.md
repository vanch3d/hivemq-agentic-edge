# VAN-20 — Conversation Flow: Brief

## Problem

When the assistant calls a tool (e.g. `queryBridges`), the chat renders:

1. A rich custom UI (table with bridge data, graph, etc.)
2. Then a separate text bubble that **restates the same data** in plain text, plus analysis/observations

This feels duplicated. Additionally:

- Assistant text is rendered as plain text (`whiteSpace: pre-wrap`) even though the LLM outputs markdown (headers, bold, lists, code blocks)
- The bot often includes "ascii-art" style content that needs monospace rendering
- The markdown headers like `### Key Observations` and `### Next Steps` render as raw text

## User Requirements

1. Tool result (custom table/graph) and assistant text commentary should feel like one cohesive response, not two separate blocks
2. Assistant text should render markdown properly (headers, bold, lists, code blocks)
3. The text after tool results is valuable (analysis, observations, next steps) but the data restatement part feels superfluous
4. The textual response is **not structured** in a way that allows selective stripping — it's freeform LLM output
