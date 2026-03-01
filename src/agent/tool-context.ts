/**
 * Shared context for agent tools.
 * Provides access to the router for navigation
 * and form coordination for mutations.
 *
 * Tools execute outside React's component tree, so they need
 * module-level refs that the ChatProvider populates on mount.
 */
import type { RJSFSchema } from "@rjsf/utils";

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
