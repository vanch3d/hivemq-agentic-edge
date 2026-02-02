# Tool Specification & UX Flow Document

## Architecture Overview

```
User types message
       ↓
Mock SSE handler matches regex → returns tool call events
       ↓
TanStack AI client receives SSE → calls registered client tool
       ↓
Tool implementation runs:
  - Query tools: call API, return data
  - Mutation tools: show form/approval → call API → return data
       ↓
Tool result sent back to mock handler (as role="tool" message)
       ↓
Mock returns follow-up text response
       ↓
Chat UI updates with result + follow-up
```

### Key Mechanism: Promise-Based UI Suspension

Mutation tools use `await requestFormInput(...)` or `await requestApproval(...)`.
These functions set React state in the ChatProvider, which causes the drawer to
render a form or approval card. The tool's execution is **suspended** until the
user interacts with the UI, which resolves the promise.

### Chat Display Pipeline (tool-status.tsx)

Every tool returns a JSON string as `part.content`. The `ToolResultStatus`
component parses it and renders through the following decision tree:

```
part.error exists?
  → YES: red error text
  → NO: parse JSON from part.content
         ↓
       Parse fails?
         → YES: raw text as pre-wrap
         → NO: result = { data?, error?, display? }
                ↓
              result.error exists?
                → YES: red error text (e.g. "Cancelled", "Rejected", "resourceId required")
                → NO:
                  result.display === "graph"?
                    → YES: render <ChatGraph /> (compact 400×300 React Flow canvas)
                    → NO:
                      result.data is Array of objects?
                        → YES: render <ChatTable /> (auto-columns, search, sort, pagination)
                        → NO: JSON.stringify(result.data, null, 2) as pre-wrap text
```

**ChatTable** (`chat-table.tsx`):
- Uses TanStack React Table
- Auto-generates columns from the first object's keys
- Has a search input (global filter)
- Column headers are clickable to sort (↑ / ↓ indicators)
- Paginated (default 10 rows per page, with ← → navigation)
- Cell values: `null`/`undefined` → "—", objects → `JSON.stringify`, else `String(val)`
- Each cell: max-width 200px, overflow ellipsis

### Column Overflow Problem

The drawer is 400px wide. Showing all columns for types with many fields is
unreadable. Here is the field count per API type:

| Type | Total fields | Required fields | Problem? |
|------|-------------|-----------------|----------|
| Bridge | 17 | 6 (id, host, port, cleanStart, keepAlive, sessionExpiry) | YES — way too wide |
| ProtocolAdapter (type listing) | 13+ | 0 | YES — too wide, 0 required |
| Event | 8 | 5 (created, identifier, message, severity, timestamp) | Borderline |
| DataPolicy | 7 | 2 (id, matching) | OK |
| BehaviorPolicy | 7 | 3 (behavior, id, matching) | OK |
| Listener | 7 | 0 | Borderline, 0 required |
| Status | 7 | 0 | Borderline, 0 required |
| PolicySchema | 6 | 3 (id, schemaDefinition, type) | OK |
| Script | 6 | 3 (functionType, id, source) | OK |
| Combiner | 5 | 4 (id, name, sources, mappings) | OK |
| Adapter | 4 | 1 (id) | OK but only 1 required |
| Notification | 4 | 0 | OK, but 0 required |
| TopicFilter | 3 | 1 (topicFilter) | OK |
| DomainTag | 3 | 2 (definition, name) | OK |
| Metric | 1 | 0 | OK |

### Strategy Assessment

**Option A: Use `required` from JSON Schema to pick default columns**

- Pros: No tool changes. Pure display logic.
- Cons: `required` means "needed for validation", not "useful for display".
  Bridge's required fields include `cleanStart`, `keepAlive`, `sessionExpiry`
  (not helpful in a summary) but NOT `status` (very helpful). Several types
  have 0 required fields (Listener, Notification, Metric, Status, ProtocolAdapter)
  which would need a fallback showing everything anyway.
- **Verdict**: `required` alone is NOT a reliable column selector.

**Option B: AI-controlled `columns` hint in tool output**

Add `columns?: string[]` to the output schema. The AI (or mock) specifies
which fields to display:

```typescript
// Tool output
return { data: bridges, columns: ["id", "host", "port", "status"] };
```

ChatTable reads `columns` and only generates those columns.

- Pros: Contextually smart — "show bridge statuses" → `["id", "status", "connection"]`.
- Cons: Requires changing output schemas, all tool implementations, and mock
  responses. The real AI model needs to know the fields to pick from.

**Option C (recommended): Static summary-column map + scalar-first fallback**

Define a `SUMMARY_COLUMNS` map keyed by a fingerprint of the data shape.
The ChatTable detects the entity type by inspecting the keys of `data[0]`
and selects the appropriate summary columns. A generic fallback picks the
first N scalar (non-object, non-array) fields.

```typescript
// chat-table-columns.ts

/**
 * Map of entity "fingerprint" → columns to show.
 * Fingerprint is a set of distinctive keys present in data[0].
 * Order matters: first match wins.
 */
export const SUMMARY_COLUMNS: Array<{
  /** Keys that must ALL be present in the object */
  fingerprint: string[];
  /** Columns to display (in order) */
  columns: string[];
}> = [
  // Bridge: has "host" + "port" + "keepAlive"
  {
    fingerprint: ["host", "port", "keepAlive"],
    columns: ["id", "host", "port", "clientId", "status"],
  },
  // ProtocolAdapter type listing: has "protocol" + "logoUrl"
  {
    fingerprint: ["protocol", "logoUrl"],
    columns: ["id", "name", "protocol", "version", "installed"],
  },
  // Adapter instance: has "config" + "type"
  {
    fingerprint: ["config", "type"],
    columns: ["id", "type", "status"],
  },
  // BehaviorPolicy: has "behavior" + "matching"
  {
    fingerprint: ["behavior", "matching"],
    columns: ["id", "matching", "behavior", "createdAt"],
  },
  // DataPolicy: has "matching" + "onSuccess"
  {
    fingerprint: ["matching", "onSuccess"],
    columns: ["id", "matching", "onSuccess", "onFailure"],
  },
  // Event: has "severity" + "timestamp" + "message"
  {
    fingerprint: ["severity", "timestamp", "message"],
    columns: ["timestamp", "severity", "message", "source"],
  },
  // Status: has "connection" + "runtime"
  {
    fingerprint: ["connection", "runtime"],
    columns: ["id", "connection", "runtime", "type"],
  },
  // Listener: has "hostName" + "transport"
  {
    fingerprint: ["hostName", "transport"],
    columns: ["name", "hostName", "port", "protocol", "transport"],
  },
  // Script: has "functionType" + "source"
  {
    fingerprint: ["functionType", "source"],
    columns: ["id", "functionType", "description", "version"],
  },
  // Schema: has "schemaDefinition"
  {
    fingerprint: ["schemaDefinition"],
    columns: ["id", "type", "version", "createdAt"],
  },
  // Combiner: has "sources" + "mappings"
  {
    fingerprint: ["sources", "mappings"],
    columns: ["id", "name", "description"],
  },
  // Notification: has "level" + "link"
  {
    fingerprint: ["level", "link"],
    columns: ["title", "level", "description"],
  },
  // DomainTag: has "definition" + "name"
  {
    fingerprint: ["definition"],
    columns: ["name", "definition", "description"],
  },
  // TopicFilter: has "topicFilter"
  {
    fingerprint: ["topicFilter"],
    columns: ["topicFilter", "description"],
  },
];

/**
 * Generic fallback: pick the first N keys whose values in data[0]
 * are scalars (string, number, boolean, null, undefined).
 * Nested objects/arrays are useless as table cells.
 */
export const MAX_FALLBACK_COLUMNS = 5;

export function getVisibleColumns(
  data: Record<string, unknown>[],
): string[] | null {
  if (data.length === 0) return null;
  const keys = new Set(Object.keys(data[0]));

  // Try fingerprint match
  for (const entry of SUMMARY_COLUMNS) {
    if (entry.fingerprint.every((k) => keys.has(k))) {
      // Only include columns that actually exist in the data
      return entry.columns.filter((c) => keys.has(c));
    }
  }

  // Fallback: first N scalar fields
  const allKeys = Object.keys(data[0]);
  const scalarKeys = allKeys.filter((k) => {
    const val = data[0][k];
    return (
      val === null ||
      val === undefined ||
      typeof val !== "object"
    );
  });
  return scalarKeys.slice(0, MAX_FALLBACK_COLUMNS);
}
```

**How ChatTable uses it**:

```typescript
// In chat-table.tsx, replace the current column generation:
const visibleKeys = useMemo(
  () => getVisibleColumns(data) ?? Object.keys(data[0]),
  [data],
);

const columns = useMemo(() => {
  return visibleKeys.map((key) =>
    columnHelper.accessor((row) => row[key], {
      id: key,
      header: key,
      cell: (info) => {
        const val = info.getValue();
        if (val === null || val === undefined) return "—";
        if (typeof val === "object") return JSON.stringify(val);
        return String(val);
      },
    }),
  );
}, [visibleKeys, columnHelper]);
```

**Optional enhancement — "show all columns" toggle**:

Add a clickable text link below the table (like the form's "show all fields")
that switches from `visibleKeys` to `allKeys`. This lets the user expand
when needed without cluttering the default view.

```tsx
{hasHiddenColumns && !showAll && (
  <Text
    as="button"
    fontSize="xs"
    color="fg.muted"
    cursor="pointer"
    onClick={() => setShowAll(true)}
  >
    Show all {allKeys.length} columns
  </Text>
)}
```

**Why this is better than the other options**:
- No tool definition changes. No output schema changes. No mock changes.
- Works immediately for all existing query tools.
- The fingerprint approach is explicit and maintainable — adding a new type
  means adding one entry to the array.
- The scalar-first fallback handles unknown types gracefully by hiding nested
  objects that would render as `[object Object]` or giant JSON blobs.
- The "show all" toggle preserves full access to all data.

---

## Query Tools (Read-Only)

All query tools follow the same pattern: call API → return `{data, error}`.
No user interaction required. The return value flows through the display
pipeline described above.

### queryBridges

- **Purpose**: List or inspect MQTT bridges
- **Input**: `{operation, bridgeId?}`
- **Operations**: `list`, `get`, `listStatus`, `getStatus`
- **Mock trigger**: `/bridge/i` (but NOT "create bridge" or "delete bridge")
- **Output**: `{data: Bridge[] | Bridge | Status[] | Status, error?: string}`
- **Chat display**:
  - `list` → `data` is `Bridge[]` (array of objects) → **ChatTable** with columns auto-generated from Bridge fields (e.g. id, host, port, clientId, etc.)
  - `get` → `data` is single `Bridge` object → **JSON pre-wrap** (not an array, so the table branch is skipped)
  - `listStatus` → `data` is `Status[]` → **ChatTable**
  - `getStatus` → `data` is single `Status` → **JSON pre-wrap**
  - On error (e.g. missing bridgeId) → **red error text**

### queryAdapters

- **Purpose**: List or inspect protocol adapters
- **Input**: `{operation, adapterId?, adapterType?}`
- **Operations**: `list`, `get`, `listTypes`, `getType`, `listTags`,
  `listNorthbound`, `listSouthbound`, `getStatus`, `listAllStatus`
- **Mock trigger**: `/adapter/i` (but NOT "create adapter")
- **Output**: `{data: Adapter[] | Adapter | ..., error?: string}`
- **Chat display**:
  - `list` → `data` is `Adapter[]` → **ChatTable**
  - `get` → `data` is single `Adapter` → **JSON pre-wrap**
  - `listTypes` → `data` is adapter type `items[]` → **ChatTable**
  - `getType` → `data` is `items[]` for that type → **ChatTable**
  - `listTags` → `data` is domain tag `items[]` → **ChatTable**
  - `listNorthbound` → `data` is mapping `items[]` → **ChatTable**
  - `listSouthbound` → `data` is mapping `items[]` → **ChatTable**
  - `getStatus` → `data` is single status → **JSON pre-wrap**
  - `listAllStatus` → `data` is `items[]` → **ChatTable**

### queryDataHub

- **Purpose**: List or inspect Data Hub resources (policies, schemas, scripts)
- **Input**: `{operation, resourceId?}`
- **Operations**: `listBehaviorPolicies`, `getBehaviorPolicy`,
  `listDataPolicies`, `getDataPolicy`, `listSchemas`, `getSchema`,
  `listScripts`, `getScript`, `listFsms`, `listFunctionSpecs`, `listVariables`
- **Mock triggers**: `/data.?polic/i`, `/schema/i`, `/script/i`, `/polic/i`
- **Output**: `{data: Policy[] | Schema[] | ..., error?: string}`
- **Chat display**:
  - All `list*` operations → `data` is `items[]` → **ChatTable**
  - All `get*` operations → `data` is single object → **JSON pre-wrap**

### querySystem

- **Purpose**: List or inspect system resources
- **Input**: `{operation, resourceId?}`
- **Operations**: `events`, `metrics`, `notifications`, `capabilities`,
  `liveness`, `readiness`, `listeners`, `isa95`, `pulseStatus`,
  `listCombiners`, `getCombiner`, `listTopicFilters`, `getTopicFilter`,
  `configuration`
- **Mock triggers**: `/topic.?filter/i`, `/combiner/i`, `/metric/i`,
  `/listener/i`, `/event/i`, `/notification/i`
- **Output**: `{data: ..., error?: string}`
- **Chat display**:
  - `events` → `data` is `items[]` → **ChatTable**
  - `metrics` → `data` is `items[]` → **ChatTable**
  - `notifications` → `data` is `items[]` → **ChatTable**
  - `capabilities` → `data` is single object (no `.items`) → **JSON pre-wrap**
  - `liveness` → `data` is single object → **JSON pre-wrap**
  - `readiness` → `data` is single object → **JSON pre-wrap**
  - `listeners` → `data` is `items[]` → **ChatTable**
  - `isa95` → `data` is single object → **JSON pre-wrap**
  - `pulseStatus` → `data` is single object → **JSON pre-wrap**
  - `listCombiners` → `data` is `items[]` → **ChatTable**
  - `getCombiner` → `data` is single object → **JSON pre-wrap**
  - `listTopicFilters` → `data` is `items[]` → **ChatTable**
  - `getTopicFilter` → `data` is single object → **JSON pre-wrap**
  - `configuration` → `data` is single object → **JSON pre-wrap**

### querySampling

- **Purpose**: Get sampling data for a topic
- **Input**: `{operation, topic}` (`topic` is **required**, not optional)
- **Operations**: `samples`, `schema`
- **Mock trigger**: None (no scenario defined — see BUG 5)
- **Output**: `{data: ..., error?: string}`
- **Chat display**:
  - `samples` → `data` is `items[]` → **ChatTable**
  - `schema` → `data` is single schema object → **JSON pre-wrap**

### queryGraph

- **Purpose**: Set graph visualization scope and return summary
- **Input**: `{scope, focusEntityId?}`
- **Scopes**: `full`, `dataFlow`, `adapterTopology`, `policyImpact`,
  `bridgeTopology`, `combinerSources`
- **Mock trigger**: `/graph|visuali[sz]e|topology|ontology|data.?flow/i`
- **Output**: `{display: "graph", scope, nodeCount, edgeCount}`
- **Chat display**: The `display: "graph"` field triggers `<ChatGraph>` — a compact
  React Flow canvas (reads from the Zustand graph store). No table, no JSON.
- **Side effect**: Calls `useGraphStore.getState().setViewScope(scope, focusEntityId)`,
  which filters and re-layouts the graph. No API calls — the graph data is already
  loaded by `useGraphData` in the workspace layout.

### navigateTo

- **Purpose**: Navigate to a route in the app
- **Input**: `{path}`
- **Mock trigger**: `/navigate|go to|take me/i`
- **Output**: `{success: boolean, path, error?: string}`
- **Chat display**: The output `{success: true, path: "/workspace"}` is not an
  array of objects, so it renders as **JSON pre-wrap**. The actual navigation has
  already happened as a side effect.
- **Note**: `KNOWN_ROUTES` is declared in `tool-definitions.ts` (line 123) but
  the tool implementation in `navigate-to.ts` **never validates against it** — see BUG 6.

---

## Mutation Tools

### mutateBridge

- **Purpose**: Create, update, delete, or transition MQTT bridges
- **Input**: `{operation, bridgeId?, prefill?}`

#### `create` — Expected UX Flow

1. User types "create bridge"
2. Mock returns `toolCallResponse("mutateBridge", {operation: "create"})`
3. Tool calls `requestFormInput()` with BridgeSchema (required: id, host, port)
4. **Chat drawer shows RJSF form** with title "Create Bridge"
   - Initially shows only required fields (id, host, port)
   - "Show all fields" link expands to full schema
5. User fills fields and clicks **Submit**
   → `activeForm.resolve({submitted: true, data})` resolves the promise
   → Tool calls `addBridge({body: data})`
   → API returns result
   → Tool returns `{data, error}`
   → Result displays in chat (single object → **JSON pre-wrap**)
   → Mock returns follow-up text
6. User clicks **Cancel**
   → `activeForm.resolve({submitted: false})` resolves the promise
   → Tool returns `{data: null, error: "Cancelled"}`
   → Result displays in chat (**red error text**: "Cancelled")
   → Mock returns follow-up text

#### `update`

Same flow as create but:
- Requires `bridgeId` in input
- Form pre-filled with `{id: bridgeId, ...prefill}`
- Title: "Update Bridge: {bridgeId}"
- `requiredOnly` is NOT set (all fields shown by default)
- API: `updateBridge({path: {bridgeId}, body})`

#### `delete`

1. User types "delete bridge"
2. Mock returns `toolCallResponse("mutateBridge", {operation: "delete", bridgeId: "mqtt-bridge-01"})`
3. Tool calls `requestApproval()` — NO form, just confirmation
4. **Chat drawer shows approval card**: "Permanently delete bridge 'mqtt-bridge-01'?"
5. User clicks **Approve** → API `removeBridge()` → result in chat
   - Success: `{data: {deleted: "mqtt-bridge-01"}}` → **JSON pre-wrap**
6. User clicks **Reject** → returns `{data: null, error: "Rejected"}` → **red error text**

#### `transitionStatus`

Same form flow as create but:
- Requires `bridgeId`
- Schema: StatusTransitionCommandSchema (required: command)
- `requiredOnly` is NOT set
- Title: "Bridge Status: {bridgeId}"
- API: `transitionBridgeStatus({path: {bridgeId}, body})`

---

### mutateAdapter

- **Purpose**: Create, update, delete, or transition protocol adapters
- **Input**: `{operation, adapterId?, adapterType?, prefill?}`

#### `create`

- Requires `adapterType` in input (returns error "adapterType is required for 'create'" if missing)
- Form: AdapterSchema (required: id, type), `requiredOnly: true`
- Title: "Create {adapterType} Adapter"
- Pre-filled with `{type: adapterType, ...prefill}`
- Submit → API: `addAdapter({path: {adapterType}, body})`
- Cancel → `{data: null, error: "Cancelled"}` → **red error text**

#### `update`

- Requires `adapterId`
- Form: AdapterSchema, `requiredOnly` not set (all fields)
- Pre-filled with `{id: adapterId, ...prefill}`
- Title: "Update Adapter: {adapterId}"
- API: `updateAdapter({path: {adapterId}, body})`

#### `delete`

- Requires `adapterId`
- Approval only (no form): "Permanently delete adapter '{adapterId}'?"
- Approve → API: `deleteAdapter({path: {adapterId}})` → `{data: {deleted}, error}`
- Reject → `{data: null, error: "Rejected"}`

#### `transitionStatus`

- Requires `adapterId`
- Form: StatusTransitionCommandSchema, `requiredOnly` not set
- Title: "Adapter Status: {adapterId}"
- API: `transitionAdapterStatus({path: {adapterId}, body})`

---

### mutateDataHub

- **Purpose**: CRUD for Data Hub resources (policies, schemas, scripts)
- **Input**: `{operation, resourceId?, prefill?}`

#### `createBehaviorPolicy`

- Form: BehaviorPolicySchema (required: id, matching, behavior), `requiredOnly: true`
- Title: "Create Behavior Policy"
- Pre-filled with `input.prefill`
- API: `createBehaviorPolicy({body})`

#### `updateBehaviorPolicy`

- Requires `resourceId`
- Form: BehaviorPolicySchema, `requiredOnly` not set (all fields)
- Pre-filled with `{id: resourceId, ...prefill}`
- Title: "Update Behavior Policy: {resourceId}"
- API: `updateBehaviorPolicy({path: {policyId}, body})`

#### `deleteBehaviorPolicy`

- Requires `resourceId`
- Approval only: "Permanently delete policy '{resourceId}'?"
- API: `deleteBehaviorPolicy({path: {policyId}})`

#### `createDataPolicy`

- Form: DataPolicySchema (required: id, matching), `requiredOnly: true`
- Title: "Create Data Policy"
- API: `createDataPolicy({body})`

#### `updateDataPolicy`

- Requires `resourceId`
- Form: DataPolicySchema, all fields, pre-filled
- Title: "Update Data Policy: {resourceId}"
- API: `updateDataPolicy({path: {policyId}, body})`

#### `deleteDataPolicy`

- Requires `resourceId`
- Approval only
- API: `deleteDataPolicy({path: {policyId}})`

#### `createSchema`

- Form: PolicySchemaSchema (required: id, schemaDefinition, type), `requiredOnly: true`
- Title: "Create Schema"
- API: `createSchema({body})`

#### `deleteSchema`

- Requires `resourceId`
- Approval only: "Permanently delete schema '{resourceId}' and all its versions?"
- API: `deleteSchema({path: {schemaId}})`

#### `createScript`

- Form: ScriptSchema (required: id, functionType, source), `requiredOnly: true`
- Title: "Create Script"
- API: `createScript({body})`

#### `deleteScript`

- Requires `resourceId`
- Approval only: "Permanently delete script '{resourceId}'?"
- API: `deleteScript({path: {scriptId}})`

---

### mutateSystem

- **Purpose**: CRUD for system resources (topic filters, combiners, ISA-95)
- **Input**: `{operation, resourceId?, data?}`
- **Note**: This tool uses **NO forms**. Data comes pre-filled from AI input.
  Approval is the only user confirmation point.

#### `addTopicFilter`

- Requires `data` in input (AI provides the payload)
- Approval: "Add topic filter '{data.topicFilter}'?"
- Approve → API: `addTopicFilters({body: data})`
- Reject → `{data: null, error: "Rejected"}` → **red error text**

#### `updateTopicFilter`

- Requires `resourceId` and `data`
- Approval: "Update topic filter '{resourceId}'?"
- API: `updateTopicFilter({path: {filter: resourceId}, body: data})`

#### `deleteTopicFilter`

- Requires `resourceId`
- Approval: "Delete topic filter '{resourceId}'?"
- API: `deleteTopicFilter({path: {filter: resourceId}})`

#### `addCombiner`

- Requires `data`
- Approval: "Create combiner '{data.id}'?"
- API: `addCombiner({body: data})`

#### `updateCombiner`

- Requires `resourceId` and `data`
- Approval: "Update combiner '{resourceId}'?"
- API: `updateCombiner({path: {combinerId: resourceId}, body: data})`

#### `deleteCombiner`

- Requires `resourceId`
- Approval: "Permanently delete combiner '{resourceId}'?"
- API: `deleteCombiner({path: {combinerId: resourceId}})`

#### `setIsa95`

- Requires `data`
- Approval: "Update the Unified Namespace ISA-95 hierarchy?"
- API: `setIsa95({body: data})`

---

## Known Bugs — Detailed Fix Instructions

### BUG 1: Cancel/Submit does not clear activeForm/activeApproval state

**Severity**: Critical — Cancel button appears to do nothing.

**Root cause**: When the user clicks Submit or Cancel on a form, or Approve/Reject
on an approval card, only `resolve()` is called. The `activeForm` / `activeApproval`
state in the ChatProvider is **never set back to null**. The form/card remains
visible in the drawer until the entire message cycle completes and a re-render
happens to wipe it.

**Files to change**:

1. `src/context/chat-context.tsx` (lines 104-119):
   The `setFormRequester` callback creates the promise but never cleans up.
   The `setApprovalRequester` callback has the same problem.

   **Fix**: Expose `setActiveForm` and `setActiveApproval` setters (or a
   `clearActiveForm()` / `clearActiveApproval()` function) so that the drawer
   can clear the state when the user interacts.

2. `src/components/chat/chat-drawer.tsx` (lines 117-142):
   The `onSubmit` and `onCancel` callbacks only call `resolve()`.

   **Fix**: After calling `resolve()`, immediately set `activeForm` to `null`.
   Same for `activeApproval` — after calling `resolve(true)` or `resolve(false)`,
   set `activeApproval` to `null`.

   **Concrete implementation options**:

   **Option A (recommended)**: Add `clearActiveForm` and `clearActiveApproval`
   functions to the ChatContext value. In `ChatProvider`:
   ```typescript
   const clearActiveForm = useCallback(() => setActiveForm(null), []);
   const clearActiveApproval = useCallback(() => setActiveApproval(null), []);
   ```
   Expose them in the context value. In `chat-drawer.tsx`:
   ```typescript
   onSubmit={(data) => {
     activeForm.resolve({ submitted: true, data });
     clearActiveForm();
   }}
   onCancel={() => {
     activeForm.resolve({ submitted: false });
     clearActiveForm();
   }}
   ```
   Same pattern for approval:
   ```typescript
   onApprove={() => {
     activeApproval.resolve(true);
     clearActiveApproval();
   }}
   onReject={() => {
     activeApproval.resolve(false);
     clearActiveApproval();
   }}
   ```

   **Option B**: Wrap the resolve-and-clear into a single helper directly
   inside the drawer component. This avoids adding to the context API but
   couples the cleanup to the drawer. Option A is cleaner.

### BUG 2: Chat input is not disabled during form/approval

**Severity**: High — allows interleaved tool calls and broken state.

**Root cause**: `ChatInput` (chat-input.tsx) only checks `isLoading` to decide
whether the input should be disabled. It does not check whether `activeForm`
or `activeApproval` is currently showing.

**File to change**: `src/components/chat/chat-input.tsx`

**Fix**: Read `activeForm` and `activeApproval` from `useChatContext()`.
Disable both the Textarea and the Send button when either is non-null.

```typescript
export function ChatInput() {
  const { sendMessage, isLoading, activeForm, activeApproval } = useChatContext();
  // ...
  const isBusy = isLoading || !!activeForm || !!activeApproval;

  const handleSend = () => {
    if (input.trim() && !isBusy) {
      sendMessage(input.trim());
      setInput("");
    }
  };

  // In the JSX:
  // <Textarea disabled={isBusy} ... />
  // <IconButton disabled={!input.trim() || isBusy} ... />
}
```

The Textarea should also visually indicate it's disabled (e.g. reduced opacity).
Chakra's `disabled` prop on `Textarea` handles this automatically.

### BUG 3: Form `showAll` state leaks across different forms

**Severity**: Medium — confusing UX when multiple forms appear in sequence.

**Root cause**: `ChatForm` (chat-form.tsx line 25) initializes
`useState(!requiredOnly)` once on mount. If the component instance is reused
(same key in the React tree), the state persists from the previous form.

**File to change**: `src/components/chat/chat-drawer.tsx` (preferred) or
`src/components/chat/chat-form.tsx`

**Fix (preferred)**: Add a `key` prop to `<ChatForm>` that changes whenever
a new form appears. The simplest unique key is the form title:

```tsx
<ChatForm
  key={activeForm.title}
  schema={activeForm.schema}
  title={activeForm.title}
  // ...
/>
```

This forces React to unmount and remount `ChatForm`, resetting all internal
state including `showAll`.

**Alternative fix** (in chat-form.tsx): Add a `useEffect` that resets `showAll`
when `requiredOnly` or `schema` changes:
```typescript
useEffect(() => {
  setShowAll(!requiredOnly);
}, [schema, requiredOnly]);
```
This is less clean because it causes a render with stale state before the
effect fires.

### BUG 4: Multiple clicks on Submit/Cancel/Approve/Reject

**Severity**: Low — no data corruption (resolving a settled promise is harmless),
but poor UX because the user doesn't know their click registered.

**Root cause**: No loading/disabled state on the buttons after the first click.

**File to change**: `src/components/chat/chat-form.tsx` and
`src/components/chat/approval-card.tsx`

**Fix**: If BUG 1 is fixed properly (state cleared on first click), the
form/card disappears immediately on click, making double-click impossible.
BUG 4 is therefore **fully resolved by fixing BUG 1**. No additional work needed.

If for some reason BUG 1 is not fixed with immediate state clearing, then:
- Add a `const [submitting, setSubmitting] = useState(false)` to both components
- Set it to `true` on first click
- Disable all buttons when `submitting` is true
- Show a spinner on the active button

### BUG 5: No mock scenario for querySampling

**Severity**: Low — tool is implemented but unreachable through mock chat.

**Root cause**: No regex pattern in `mocks/handlers/chat.ts` matches a message
that should trigger `querySampling`.

**File to change**: `src/mocks/handlers/chat.ts`

**Fix**: Add a new scenario entry in the query scenarios section (after the
existing query patterns, before the graph/navigation patterns):

```typescript
{
  match: (t) => /sampl/i.test(t),
  events: () => toolCallResponse("querySampling", {
    operation: "samples",
    topic: "test/topic"
  }),
  followUp: "Here are the sampled messages for topic 'test/topic'.",
},
```

**Note**: `querySampling` requires `topic` (not optional in the schema), so
the mock must provide a default topic value. In a real AI scenario, the model
would extract the topic from the user's message.

### BUG 6: navigateTo does not validate against KNOWN_ROUTES

**Severity**: Low — any path is accepted, potentially navigating to non-existent
routes (which TanStack Router would handle with a 404).

**Root cause**: `KNOWN_ROUTES` is declared in `tool-definitions.ts` (line 123)
but the tool implementation in `navigate-to.ts` never imports or checks it.

**File to change**: `src/agent/tools/navigate-to.ts`

**Fix**: Import `KNOWN_ROUTES` and validate:

```typescript
import { navigateToDef, KNOWN_ROUTES } from "@/agent/tool-definitions";
```

Wait — `KNOWN_ROUTES` is not currently exported. Two changes needed:

1. In `src/agent/tool-definitions.ts`, change line 123 from `const` to `export const`:
   ```typescript
   export const KNOWN_ROUTES = ["/workspace", "/login"] as const;
   ```

2. In `src/agent/tools/navigate-to.ts`, add validation:
   ```typescript
   const isKnown = KNOWN_ROUTES.some((r) => input.path.startsWith(r));
   if (!isKnown) {
     return {
       success: false,
       path: input.path,
       error: `Unknown route: ${input.path}. Known routes: ${KNOWN_ROUTES.join(", ")}`,
     };
   }
   ```

   **Note**: Use `startsWith` rather than exact match so that sub-routes
   like `/workspace/graph` still pass validation.

### BUG 7: Fragile regex ordering in mock handler

**Severity**: Low (mock only) — acceptable for a mock but should be documented.

**Root cause**: Scenario matching in `mocks/handlers/chat.ts` depends on array
order. Several regexes overlap:
- "create data policy" could match the behavior policy pattern (`/(?:create|add)\s+(?:behavior\s+)?polic/i`) because the `behavior\s+` part is optional
- Any message containing "bridge" matches the query even if the user meant something else
- "show adapters and bridges" would match whichever pattern comes first

**This is a known limitation of the mock and does NOT need to be fixed.** It
should be documented in the mock file with a comment. The real AI backend would
use semantic understanding, not regex matching.

However, there is one **actual bug** in the ordering: the pattern for "create
behavior policy" (`/(?:create|add)\s+(?:behavior\s+)?polic/i`) with the optional
`behavior\s+` will also match "create data policy" because "policy" matches
`polic`. The data policy pattern comes right after it but will never be reached
for messages containing "create" + "policy" without "data" explicitly.

**Fix** (if desired): Make the behavior policy pattern require "behavior":
```typescript
match: (t) => /(?:create|add)\s+behavior\s+polic/i.test(t),
```

And the data policy pattern can remain as-is since it requires "data":
```typescript
match: (t) => /(?:create|add)\s+data\s+polic/i.test(t),
```

---

## Mock Scenarios — Complete Reference

| User message pattern          | Tool called                        | Args                                  |
| ----------------------------- | ---------------------------------- | ------------------------------------- |
| `create adapter`              | `mutateAdapter`                    | `{operation: "create"}`               |
| `create behavior policy`      | `mutateDataHub`                    | `{operation: "createBehaviorPolicy"}` |
| `create data policy`          | `mutateDataHub`                    | `{operation: "createDataPolicy"}`     |
| `create schema`               | `mutateDataHub`                    | `{operation: "createSchema"}`         |
| `create script`               | `mutateDataHub`                    | `{operation: "createScript"}`         |
| `create topic filter`         | `mutateSystem`                     | `{operation: "addTopicFilter"}`       |
| `create bridge`               | `mutateBridge`                     | `{operation: "create"}`               |
| `create combiner`             | `mutateSystem`                     | `{operation: "addCombiner"}`          |
| `delete bridge`               | `mutateBridge`                     | `{operation: "delete", bridgeId: "mqtt-bridge-01"}` |
| `bridge` (generic)            | `queryBridges`                     | `{operation: "list"}`                 |
| `adapter` (generic)           | `queryAdapters`                    | `{operation: "list"}`                 |
| `topic filter`                | `querySystem`                      | `{operation: "listTopicFilters"}`     |
| `combiner`                    | `querySystem`                      | `{operation: "listCombiners"}`        |
| `data policy`                 | `queryDataHub`                     | `{operation: "listDataPolicies"}`     |
| `schema`                      | `queryDataHub`                     | `{operation: "listSchemas"}`          |
| `script`                      | `queryDataHub`                     | `{operation: "listScripts"}`          |
| `policy` (generic)            | `queryDataHub`                     | `{operation: "listBehaviorPolicies"}` |
| `metrics`                     | `querySystem`                      | `{operation: "metrics"}`              |
| `listener`                    | `querySystem`                      | `{operation: "listeners"}`            |
| `events`                      | `querySystem`                      | `{operation: "events"}`               |
| `notification`                | `querySystem`                      | `{operation: "notifications"}`        |
| `graph / visualize / topology`| `queryGraph`                       | `{scope: "dataFlow"}`                 |
| `navigate / go to / take me`  | `navigateTo`                       | `{path: "/workspace"}`                |
| `create / add new` (fallback) | `mutateBridge`                     | `{operation: "create"}`               |

---

## Form Schema Registry — Complete Reference

| Registry Key                             | API Schema              | Required Fields                         | requiredOnly |
| ---------------------------------------- | ----------------------- | --------------------------------------- | ------------ |
| `mutateBridge.create`                    | BridgeSchema            | id, host, port                          | true         |
| `mutateBridge.update`                    | BridgeSchema            | (from schema)                           | false        |
| `mutateBridge.transitionStatus`          | StatusTransitionCommand  | command                                 | false        |
| `mutateAdapter.create`                   | AdapterSchema           | id, type                                | true         |
| `mutateAdapter.update`                   | AdapterSchema           | (from schema)                           | false        |
| `mutateAdapter.transitionStatus`         | StatusTransitionCommand  | command                                 | false        |
| `mutateDataHub.createBehaviorPolicy`     | BehaviorPolicySchema    | id, matching, behavior                  | true         |
| `mutateDataHub.updateBehaviorPolicy`     | BehaviorPolicySchema    | (from schema)                           | false        |
| `mutateDataHub.createDataPolicy`         | DataPolicySchema        | id, matching                            | true         |
| `mutateDataHub.updateDataPolicy`         | DataPolicySchema        | (from schema)                           | false        |
| `mutateDataHub.createSchema`             | PolicySchemaSchema      | id, schemaDefinition, type              | true         |
| `mutateDataHub.createScript`             | ScriptSchema            | id, functionType, source                | true         |

**Not in registry** (use approval only, no form):
- All delete operations
- All mutateSystem operations

---

## Complete File Reference

### Tool Implementations (src/agent/tools/)

| File | Tool | Type | Lines |
|------|------|------|-------|
| `query-bridges.ts` | queryBridges | query | 48 |
| `query-adapters.ts` | queryAdapters | query | 116 |
| `query-data-hub.ts` | queryDataHub | query | 118 |
| `query-system.ts` | querySystem | query | 116 |
| `query-sampling.ts` | querySampling | query | 28 |
| `query-graph.ts` | queryGraph | query (side-effect) | 17 |
| `navigate-to.ts` | navigateTo | action | 20 |
| `mutate-bridge.ts` | mutateBridge | mutation (form/approval) | 102 |
| `mutate-adapter.ts` | mutateAdapter | mutation (form/approval) | 109 |
| `mutate-data-hub.ts` | mutateDataHub | mutation (form/approval) | 219 |
| `mutate-system.ts` | mutateSystem | mutation (approval only) | 141 |

### UI Components (src/components/chat/)

| File | Purpose | Bugs |
|------|---------|------|
| `chat-drawer.tsx` | Main drawer: message list + form/approval area + input | BUG 1 (lines 124-129, 138-139) |
| `chat-input.tsx` | Text input + send button | BUG 2 (no disable during form) |
| `chat-form.tsx` | RJSF form wrapper with show-all toggle | BUG 3 (showAll leak) |
| `approval-card.tsx` | Approve/Reject card | BUG 4 (no disable after click) |
| `tool-status.tsx` | Tool call/result rendering dispatch | — |
| `chat-table.tsx` | TanStack Table for array results | — |
| `message-list.tsx` | Message rendering | — |

### Infrastructure

| File | Purpose |
|------|---------|
| `src/agent/tool-definitions.ts` | Zod schemas + tool metadata (no execution) |
| `src/agent/tool-context.ts` | Module-level refs for navigate/form/approval coordination |
| `src/agent/form-schemas.ts` | Registry mapping (toolName, operation) → {schema, requiredOnly} |
| `src/agent/tools/index.ts` | Re-exports all tool implementations |
| `src/context/chat-context.tsx` | ChatProvider: useChat + activeForm/activeApproval state |
| `src/mocks/handlers/chat.ts` | MSW mock SSE handler with regex scenario matching |

---

## Bug Fix Priority Order

1. **BUG 1** (Critical) → Fix first. Cancel/Submit/Approve/Reject must clear state.
2. **BUG 2** (High) → Fix second. Disable input during form/approval.
3. **BUG 3** (Medium) → Fix third. Add `key` to ChatForm.
4. **BUG 4** (Low) → Auto-resolved by BUG 1 fix.
5. **BUG 5** (Low) → Add querySampling mock scenario.
6. **BUG 6** (Low) → Export KNOWN_ROUTES and validate in navigate-to.ts.
7. **BUG 7** (Low/Mock-only) → Tighten behavior policy regex if desired.
