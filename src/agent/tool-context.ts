/**
 * Shared context for agent tools.
 * Provides access to the router for navigation
 * and form coordination for mutations.
 *
 * Tools execute outside React's component tree, so they need
 * module-level refs that the ChatProvider populates on mount.
 */
import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import type { QueryClient } from "@tanstack/react-query";

// --- Navigation ---

type NavigateFn = (path: string) => void;

let _navigate: NavigateFn | null = null;

export function setToolNavigate(fn: NavigateFn): void {
  _navigate = fn;
}

export function getToolNavigate(): NavigateFn | null {
  return _navigate;
}

// --- Form coordination ---

export type FormRequest = {
  schema: RJSFSchema;
  uiSchema?: UiSchema;
  title: string;
  formData?: unknown;
  requiredOnly?: boolean;
};

type FormRequestFn = (
  request: FormRequest,
) => Promise<{ submitted: true; data: unknown } | { submitted: false }>;

let _requestForm: FormRequestFn | null = null;

export function setFormRequester(fn: FormRequestFn): void {
  _requestForm = fn;
}

export function requestFormInput(
  request: FormRequest,
): Promise<{ submitted: true; data: unknown } | { submitted: false }> {
  if (!_requestForm) {
    return Promise.resolve({ submitted: false });
  }
  return _requestForm(request);
}

// --- Approval coordination ---

export type ApprovalRequest = {
  title: string;
  description: string;
};

type ApprovalRequestFn = (request: ApprovalRequest) => Promise<boolean>;

let _requestApproval: ApprovalRequestFn | null = null;

export function setApprovalRequester(fn: ApprovalRequestFn): void {
  _requestApproval = fn;
}

export function requestApproval(request: ApprovalRequest): Promise<boolean> {
  if (!_requestApproval) {
    return Promise.resolve(false);
  }
  return _requestApproval(request);
}

// --- Snapshot coordination ---

export type SnapshotRequest = {
  toolName: string;
  operation: string;
  displayType: "table" | "json" | "graph";
  data: unknown;
  label: string;
  graphScope?: string;
  graphFocusEntityId?: string;
};

type SnapshotCreatorFn = (request: SnapshotRequest) => string;

let _createSnapshot: SnapshotCreatorFn | null = null;

export function setSnapshotCreator(fn: SnapshotCreatorFn): void {
  _createSnapshot = fn;
}

export function createToolSnapshot(request: SnapshotRequest): string | null {
  if (!_createSnapshot) return null;
  return _createSnapshot(request);
}

// --- Query invalidation ---

type InvalidateQueriesFn = () => void;

let _invalidateQueries: InvalidateQueriesFn | null = null;

export function setQueryInvalidator(fn: InvalidateQueriesFn): void {
  _invalidateQueries = fn;
}

export function invalidateQueries(): void {
  _invalidateQueries?.();
}

// --- Adapter type cache (TanStack Query with staleTime: Infinity) ---

const ADAPTER_TYPES_QUERY_KEY = ["adapterTypes"] as const;

let _queryClient: QueryClient | null = null;
let _adapterTypesFetcher: (() => Promise<unknown[]>) | null = null;

export function setQueryClient(qc: QueryClient): void {
  _queryClient = qc;
}

/**
 * Register the function that fetches adapter types from the API.
 * Keeps sdk.gen imports out of this module.
 */
export function setAdapterTypesFetcher(
  fn: () => Promise<unknown[]>,
): void {
  _adapterTypesFetcher = fn;
}

/**
 * Prefetch adapter types into the query cache.
 * Call once at app startup (e.g. in ChatProvider mount).
 */
export function prefetchAdapterTypes(): void {
  if (!_queryClient || !_adapterTypesFetcher) return;
  const fetcher = _adapterTypesFetcher;
  _queryClient.prefetchQuery({
    queryKey: ADAPTER_TYPES_QUERY_KEY,
    queryFn: fetcher,
    staleTime: Infinity,
  });
}

/**
 * Get a single adapter type by ID from the cache.
 * Uses ensureQueryData — returns cached data instantly if available,
 * fetches once if the cache is cold.
 */
export async function getAdapterTypeById(
  typeId: string,
): Promise<Record<string, unknown> | undefined> {
  if (!_queryClient || !_adapterTypesFetcher) return undefined;
  const fetcher = _adapterTypesFetcher;
  const types = await _queryClient.ensureQueryData<unknown[]>({
    queryKey: ADAPTER_TYPES_QUERY_KEY,
    queryFn: fetcher,
    staleTime: Infinity,
  });
  return (types as Record<string, unknown>[]).find(
    (t) => t.id === typeId,
  );
}
