import { createFileRoute } from "@tanstack/react-router";
import { SnapshotPage } from "@/components/snapshot/snapshot-page";

export const Route = createFileRoute("/_authenticated/workspace/snapshot/$id")({
  component: SnapshotRoute,
});

function SnapshotRoute() {
  const { id } = Route.useParams();
  return <SnapshotPage id={id} />;
}
