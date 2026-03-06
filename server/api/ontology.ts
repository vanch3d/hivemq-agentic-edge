import { Hono } from "hono";
import { readFileSync } from "node:fs";

interface OntologyModule {
  id: string;
  name: string;
  description: string;
}

const MODULES: OntologyModule[] = [
  {
    id: "core",
    name: "Core (v1)",
    description:
      "System overview, entity catalog, relationships, data flow, status model, authentication, collection patterns, error model, key enums.",
  },
  {
    id: "v2-core",
    name: "Core (v2)",
    description:
      "Auto-generated domain ontology v2 — 18 entity types organized by taxonomy role with typed properties and relationships.",
  },
  {
    id: "datahub",
    name: "Data Hub",
    description:
      "Function catalog, behavior models & FSMs, validation strategies, transformation scripts, string interpolation, system limits, policy evaluation flow.",
  },
  {
    id: "adapters",
    name: "Adapters",
    description:
      "JsonNode disambiguation, adapter type ecosystem, tag semantics, form generation.",
  },
  {
    id: "messaging",
    name: "Messaging",
    description:
      "Anatomy of a chat message — UIMessage parts, streaming protocol (AG-UI/SSE), tool execution lifecycle, agent loop, and UI rendering pipeline.",
  },
];

function loadMarkdown(id: string): string {
  return readFileSync(
    new URL(`../ontology/${id}.md`, import.meta.url),
    "utf-8",
  );
}

const ontologyRoute = new Hono();

// List all modules (no content)
ontologyRoute.get("/", (c) => {
  return c.json(MODULES);
});

// Get a single module with markdown content
ontologyRoute.get("/:module", (c) => {
  const moduleId = c.req.param("module");
  const mod = MODULES.find((m) => m.id === moduleId);
  if (!mod) {
    return c.json({ error: "Module not found" }, 404);
  }
  return c.json({ ...mod, content: loadMarkdown(mod.id) });
});

// --- About page ---

const aboutRoute = new Hono();

aboutRoute.get("/", (c) => {
  const content = readFileSync(
    new URL("../about.md", import.meta.url),
    "utf-8",
  );
  return c.json({ content });
});

export { aboutRoute };
export default ontologyRoute;
