# VAN-30: Open Issues

## ISSUE-1: Zoom threshold hitch (hysteresis & transitions)

**Status**: Open
**Priority**: Medium
**Phase**: Post Phase 1 (polish)

### Problem

Crossing zoom thresholds (0.4 for dot↔compact, 0.8 for compact↔full) causes a visible rendering hitch. The entire visible node set undergoes a big-bang DOM swap — every node simultaneously switches between detail levels (e.g., from a simple `<Box>` dot to a multi-element compact layout). This creates a perceptible stutter, especially with hundreds of nodes in the viewport.

### Root Cause

`useZoomDetail()` fires a single bucket transition (e.g., `"dot"` → `"compact"`) and every `BaseNode` instance re-renders in the same frame with a completely different DOM subtree. React cannot transition between structurally different render outputs — it must tear down and rebuild.

### Approaches to Explore

#### 1. Hysteresis (different thresholds for zoom-in vs zoom-out)

Use separate thresholds depending on zoom direction to prevent flickering at boundary:

```
zoom-in:   dot → compact at 0.45,  compact → full at 0.85
zoom-out:  full → compact at 0.75, compact → dot at 0.35
```

This creates a dead zone where the current level is maintained, preventing rapid toggling when the user hovers around a threshold. Requires tracking previous zoom level or direction.

#### 2. CSS transitions for visual continuity

Render **both** detail levels simultaneously during transition, crossfading with CSS opacity:

- When crossing a threshold, keep the outgoing level visible (`opacity: 1 → 0`) while fading in the incoming level (`opacity: 0 → 1`) over ~150-200ms.
- After transition completes, unmount the outgoing level.
- This gives the eye time to adjust and hides the structural DOM change.

#### 3. Combination approach

Hysteresis prevents unnecessary transitions; CSS crossfade smooths the transitions that do occur. Both are complementary.

### Rejected

- **Debounce**: Blocks all rendering until zoom gesture ends — unacceptable UX. The user sees a frozen graph during pinch/scroll zoom, then a sudden jump.

### Notes

- React.memo on node components has marginal benefit here since `useZoomDetail()` inside `BaseNode` triggers re-renders from within, not from parent prop changes.
- The hitch is most noticeable when many nodes are visible (the crossfade approach scales cost with visible node count, but the visual improvement is worth it).
