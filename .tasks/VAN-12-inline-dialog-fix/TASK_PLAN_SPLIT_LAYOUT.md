# Plan: Chat Drawer Split Layout for Inline Forms

## Context

When the AI requests form input via `activeForm`, the form renders inline at the bottom of the chat drawer with no height constraint or overflow control. Long forms (especially "Show all fields") push submit/cancel buttons off-screen, making them unreachable. The chat input also remains visible even though the user shouldn't send messages while the AI awaits form data.

The fix: restructure the drawer into three layout states — normal, form-active (split view), and approval-active (footer swap).

## Layout States

### Normal (no form, no approval)

```
DrawerBody
  Flex (flex=1, overflow=hidden)
    MessageList (flex-grow, overflow=auto)
    ErrorBox (conditional)
  ChatInput (footer)
```

### Form active

```
DrawerBody
  Splitter (vertical, 50/50, resizable)
    Panel "messages": MessageList (overflow=auto)
    ResizeTrigger (thin horizontal bar)
    Panel "form": Form fields only (overflow=auto, scrollable)
  ErrorBox (conditional)
  ChatFormFooter: [Submit] [Cancel] [Show all fields] — always visible, replaces ChatInput
```

### Approval active

```
DrawerBody
  Flex (flex=1, overflow=hidden)
    MessageList (flex-grow, overflow=auto)
    ErrorBox (conditional)
  ApprovalCard (footer position, replaces ChatInput)
```

## Implementation Steps

### 1. Add ref forwarding to `SchemaForm`

**File:** `src/components/schema-form.tsx`

Add an explicit `ref` prop to `SchemaFormProps` and pass it to the RJSF `<Form>`. This exposes `form.submit()` for programmatic submission from an external button. React 19 treats `ref` as a regular prop, so no `forwardRef` needed — just destructure and pass it through.

### 2. Split `ChatForm` into two components

**Delete:** `src/components/chat/chat-form.tsx` (code moves to two new files)

**Create:** `src/components/chat/chat-form-fields.tsx`

- Renders the heading + `SchemaForm` with form fields only
- Accepts `formRef` prop (passed to `SchemaForm` ref) for external submit
- Accepts `showAll` prop to control required-only vs full schema display
- Passes `<></>` as `SchemaForm` children to suppress the default RJSF submit button
- Preserves the `key={showAll ? "full" : "required"}` pattern to remount on schema toggle

**Create:** `src/components/chat/chat-form-footer.tsx`

- Renders Submit, Cancel, and "Show all fields" toggle in a horizontal `Flex`
- Submit calls `formRef.current?.submit()` — triggers RJSF validation + submit flow
- Cancel calls `onCancel()`
- "Show all fields" calls `onToggleShowAll()`
- Styled identically to `ChatInput` (border-top, p=3) for visual consistency

### 3. Restructure `ChatDrawer` with three-state layout

**File:** `src/components/chat/chat-drawer.tsx`

Replace the single Flex layout with a conditional three-branch structure:

- **Form active branch:** Uses `Splitter` (from `@/components/ui/splitter`) with `orientation="vertical"`, `defaultSize={[50, 50]}`, `panels=[{id:"messages", minSize:20}, {id:"form", minSize:20}]`. Top panel = `MessageList`, bottom panel = `ChatFormFields` in a scrollable Box. Footer = `ChatFormFooter`.
- **Approval active branch:** Full-height `MessageList` + `ApprovalCard` in footer position.
- **Normal branch:** Full-height `MessageList` + `ChatInput` in footer position.

Lift `showAll` state and `formRef` into `ChatDrawer`. Add a `useEffect` to reset `showAll` to `!activeForm.requiredOnly` when `activeForm` changes.

`SplitterPanel` elements need `overflow="hidden"` and `display="flex"` so children fill them properly.

### 4. Style the resize trigger

Minimal visual indicator — thin horizontal line (2-4px, subtle bg, hover highlight).

## Files Changed

| File                                       | Action                                               |
| ------------------------------------------ | ---------------------------------------------------- |
| `src/components/schema-form.tsx`           | Add `ref` prop forwarding to RJSF Form               |
| `src/components/chat/chat-form.tsx`        | Delete (code moves to new files)                     |
| `src/components/chat/chat-form-fields.tsx` | **New** — form fields panel                          |
| `src/components/chat/chat-form-footer.tsx` | **New** — footer controls                            |
| `src/components/chat/chat-drawer.tsx`      | Major restructure — three-state layout with Splitter |

## Key Technical Details

- **Programmatic form submit:** RJSF `Form` class exposes `submit()` method via ref. Preserves built-in schema validation.
- **RJSF button suppression:** `<></>` children triggers existing `norender: true`.
- **Schema remount on toggle:** `key={showAll ? "full" : "required"}` forces remount.
- **Splitter API:** `panels` prop defines panel metadata (id, minSize). `defaultSize` is percentages. `SplitterResizeTrigger` id format: `"panelA:panelB"`.

## Verification

1. Trigger a form request — drawer splits 50/50, both halves scroll independently
2. Click "Show all fields" — bottom panel scrolls, footer controls stay visible
3. Submit — validates, submits, split disappears, chat input returns
4. Cancel — split disappears, chat input returns
5. Drag resize trigger — panels resize
6. Trigger approval — no split, approval in footer, chat input hidden
7. Approve/Reject — approval disappears, chat input returns
8. `pnpm tsc -b` and `pnpm lint` pass
