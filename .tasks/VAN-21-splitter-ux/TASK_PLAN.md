# VAN-21 — Task Plan

## Architecture Overview

The current layout is: **Toolbar → Sidebar (240px) + Main content (flex) + ChatDrawer (overlay)**

The new layout is: **Toolbar → Splitter[ ChatPanel (left) | Outlet (right) ]**

```
┌──────────────────────────────────────────────────────┐
│  Toolbar   [Logo]              [Theme] [User ▾]      │
├─────────────────────┬─┬──────────────────────────────┤
│  Chat Header        │ │  Route Content               │
│  [AI Assistant] ● m │ │  (graph / config / snapshot)  │
│─────────────────────│▐│                              │
│                     │▐│                              │
│  Message bubbles    │▐│                              │
│  ...                │▐│                              │
│                     │▐│                              │
│─────────────────────│ │                              │
│  [Prompt input ▸]   │ │                              │
└─────────────────────┴─┴──────────────────────────────┘
         ↕ drag                   ↕ flex
```

## Key Decisions

### D1. Chat is always visible — no drawer toggle

The conversation panel is a permanent splitter pane, not a togglable drawer. The `isOpen`/`onOpen`/`onClose`/`onToggle` state in `ChatContext` and the `ChatToggleButton` component become unused. The Cmd+K shortcut can be repurposed to focus the chat input instead.

### D2. ChatPanel extracts drawer internals

The existing `ChatDrawer` contains all the chat UI logic (form split view, approval card, error box, normal chat). We extract the body content into a new `ChatPanel` component that is a plain flex column — no drawer wrapper. The drawer imports and wrappers are dropped.

### D3. Splitter sizing

The Chakra UI Splitter uses percentage-based sizes. We set:

- **Default split**: `[35, 65]` — conversation gets ~35% of viewport width
- **Min sizes**: chat panel `minSize={25}`, outlet panel `minSize={30}`
- The absolute minimum width of the chat panel (at 25% of a 1024px viewport) is ~256px, which is comfortable for the conversation UI

### D4. Toolbar changes

- **Remove**: `ChatToggleButton` (no longer needed)
- **Add**: Domain Ontology nav link (moved from sidebar) + Snapshots nav link
- **User menu**: Add a `LuChevronDown` caret icon next to the avatar/username to make the dropdown affordance visible. Menu already contains Configuration and Logout — keep as-is.

### D5. Snapshots route

Create a new route `/workspace/snapshots` that renders the snapshot list as a full page. The sidebar's snapshot rendering logic moves here. This is a lightweight lift — reuse the same `useSnapshotStore` and `formatRelativeTime` with a page-level layout.

### D6. Sidebar removal

Delete `src/components/workspace/sidebar.tsx`. Its responsibilities are redistributed:

- **Graph nav link** → Toolbar
- **Snapshot list** → New `/workspace/snapshots` route
- **Logout button** → Already in toolbar user menu

### D7. Chat context cleanup

Remove the drawer-related state (`isOpen`, `onOpen`, `onClose`, `onToggle`) from `ChatContextValue`. Remove the `Cmd+K` toggle handler. Optionally repurpose `Cmd+K` to focus the prompt `<textarea>`.

## File Changes

| File                                                | Action     | Description                                                                                                                     |
| --------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------- | --------- |
| `src/components/chat/chat-panel.tsx`                | **Create** | New component: extracts chat body from `ChatDrawer` (header + message list + input/form/approval). Pure flex column, no drawer. |
| `src/routes/_authenticated/workspace.tsx`           | **Modify** | Replace `Sidebar + Box + ChatDrawer` with `Splitter[ ChatPanel                                                                  | Outlet ]` |
| `src/components/workspace/toolbar.tsx`              | **Modify** | Remove `ChatToggleButton`. Add nav links (Graph, Snapshots). Add caret to user menu trigger.                                    |
| `src/context/chat-context.tsx`                      | **Modify** | Remove `isOpen`/`onOpen`/`onClose`/`onToggle` state and Cmd+K toggle. Optionally add `inputRef` for Cmd+K focus.                |
| `src/components/chat/chat-toggle-button.tsx`        | **Delete** | No longer needed                                                                                                                |
| `src/components/workspace/sidebar.tsx`              | **Delete** | Replaced by toolbar nav + snapshots page                                                                                        |
| `src/components/chat/chat-drawer.tsx`               | **Modify** | Strip to re-export or delete. All logic moves to `chat-panel.tsx`.                                                              |
| `src/routes/_authenticated/workspace/snapshots.tsx` | **Create** | New route: full-page snapshot list                                                                                              |
| `src/locales/en-US.json`                            | **Modify** | Add `nav.snapshots` key, update `chat.toggle` if needed                                                                         |

## Implementation Steps

### Phase 1: Create ChatPanel (extract from drawer)

- [x] Create `src/components/chat/chat-panel.tsx`
  - Move `FormSplitView`, `ErrorBox`, `formatError`, `useProviderLabel` from `chat-drawer.tsx`
  - Export `ChatPanel` — a `<Flex direction="column" h="full">` with header, body (3 states: form/approval/normal), and footer
  - Header: reuse drawer header content (title + model badge) but as a plain `<Flex>` with bottom border
  - No drawer imports, no open/close logic

- [x] Verify `ChatPanel` compiles standalone

### Phase 2: Rewire workspace layout

- [x] Modify `workspace.tsx`:
  - Remove `Sidebar` and `ChatDrawer` imports
  - Import `ChatPanel` + Splitter components
  - Replace inner `<Flex>` with:
    ```tsx
    <Splitter
      orientation="horizontal"
      defaultSize={[35, 65]}
      panels={[
        { id: "chat", minSize: 25 },
        { id: "content", minSize: 30 },
      ]}
    >
      <SplitterPanel id="chat">
        <ChatPanel />
      </SplitterPanel>
      <SplitterResizeTrigger id="chat:content" />
      <SplitterPanel id="content">
        <Box as="main" flex="1" overflow="auto" p="6">
          <Outlet />
        </Box>
      </SplitterPanel>
    </Splitter>
    ```
  - Style the resize trigger (vertical bar, hover highlight)

- [x] Remove `<main>` padding on right panel only for graph route (graph needs full bleed — check if p="6" is a problem)

### Phase 3: Toolbar navigation

- [x] Remove `ChatToggleButton` import and usage from toolbar
- [x] Add navigation links: Graph (`LuNetwork`) and Snapshots (`LuHistory`)
  - Use `<Button asChild variant="ghost"><Link to="...">` pattern
  - Highlight active route with `variant="subtle"`
- [x] Add `LuChevronDown` icon to user menu trigger button, after the username text
- [x] Verify responsive: hide nav labels on small screens, show icons only

### Phase 4: Snapshots page

- [x] Create `src/routes/_authenticated/workspace/snapshots.tsx`
  - Render snapshot list in a page layout (reuse sidebar snapshot rendering)
  - Include "Clear all" action
  - Empty state when no snapshots
- [x] Add `nav.snapshots` to `en-US.json`

### Phase 5: New conversation button

- [x] Add a "New conversation" icon button (`LuPlus` or `LuMessageSquarePlus`) in the `ChatPanel` header, next to the model badge
- [x] Wire it to `clear()` from `useChatContext()`
- [x] Add tooltip: "New conversation"
- [x] Add `chat.newConversation` key to `en-US.json`

### Phase 6: Cleanup

- [x] Delete `src/components/workspace/sidebar.tsx`
- [x] Delete `src/components/chat/chat-toggle-button.tsx`
- [x] Delete or gut `src/components/chat/chat-drawer.tsx` (if not fully replaced in Phase 1)
- [x] Clean `ChatContext`: remove `isOpen`/`onOpen`/`onClose`/`onToggle` from type and provider
- [x] Remove Cmd+K toggle handler (or repurpose to focus chat input)
- [x] Remove unused imports and locale keys
- [x] `pnpm build` — zero errors
- [x] `pnpm lint` — clean

## Open Questions / Suggestions

1. **Graph padding**: The graph canvas currently gets `p="6"` from the `<main>` wrapper. With the new layout, the graph should probably be full-bleed in the right panel (no padding), while other pages (config, snapshot detail) keep padding. Consider a per-route approach or moving padding into individual route components.

2. **Mobile breakpoint**: On narrow viewports (< 768px), a side-by-side splitter won't work well. Options:
   - (a) Stack vertically: chat on top, content below (like a mobile app)
   - (b) Tab-based toggle between chat and content
   - (c) Keep current drawer behavior on mobile only
   - **Suggestion**: Start with (c) — use a `useBreakpointValue` to render the splitter layout on `md+` and fall back to a simpler mobile layout. This can be a follow-up task.

3. **Splitter persistence**: The user's preferred split position could be persisted to `localStorage` so it survives page refreshes. The Chakra Splitter supports `onSizesChange` callback. **Suggestion**: Add this as a small enhancement — store via `useLocalStorage`.

4. **"New conversation" button**: With the chat always visible, add a "New conversation" button in the chat header (next to the model badge). This calls the existing `clear()` which empties the message bubbles and resets the model label — the next message will start a fresh server-side conversation with a new `conversationId`. It does **not** reset app state (JWT, settings, snapshots). Think of it as ChatGPT's "New Chat" — a clean slate for the conversation, not an agentic operation. There is no conversation persistence today, so nothing is lost.
