import { createFileRoute } from "@tanstack/react-router";
import { GraphPage } from "@/graph/components/graph-page";

export const Route = createFileRoute("/_authenticated/workspace/graph")({
  component: GraphPage,
});
