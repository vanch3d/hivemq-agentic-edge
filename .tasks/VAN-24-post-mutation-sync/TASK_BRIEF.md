# VAN-24 — Task Brief

## Observed behavior

User asks: "let's create a new bridge called test4567"

1. Agent responds: "I'll help you create a new bridge..."
2. Agent calls `mutateBridge` tool — form opens with name prefilled
3. User submits the form — API call succeeds
4. **Problem 1**: The ontology graph does not update to show the new bridge
5. **Problem 2**: The agent's next response describes the form as still pending ("A form has appeared for you to fill in...") rather than acknowledging the successful creation

## Expected behavior

- After successful mutation, the graph should refresh to show new/changed entities
- The agent should acknowledge the result: "Bridge test4567 has been created successfully"
