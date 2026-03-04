# OPENAPI-09: Fix Grammar, Typos, and en-US Style Issues

**Epic:** [OpenAPI Specification Quality & Agentic Readiness](./EPIC.md)
**Priority:** P2 Medium
**Type:** Correctness
**Review sections:** 8, 28, 29

## Problem

20+ grammar/typo issues, garbled descriptions, and inconsistent text conventions across summaries, descriptions, and property-level documentation. These surface directly in generated documentation, UI forms (via RJSF), and agentic context.

## Scope

### Part A — Fix typos and grammar (17 items)

| Location                                         | Current                  | Fix                                  |
| ------------------------------------------------ | ------------------------ | ------------------------------------ |
| `delete-adapter-domainTags` summary              | "an domain"              | "a domain"                           |
| `delete-topicFilter` summary                     | "an topic"               | "a topic"                            |
| `getTagSchema` description                       | "portocol"               | "protocol"                           |
| `getSchemaForTopic` summary                      | "based in"               | "based on"                           |
| `getSamplesForTopic` summary                     | "their gathered"         | "are gathered"                       |
| `getBehaviorPolicy` summary                      | "Get a policy"           | "Get a policy" (remove double space) |
| `get-listeners` summary                          | Trailing space           | Remove trailing space                |
| `getAdapter` description                         | Unmatched trailing quote | Remove quote                         |
| `get-adapter-status` description                 | "status an adapter"      | "status of an adapter"               |
| `list-response-b` (scripts)                      | "sripts"                 | "scripts"                            |
| `NorthboundMapping.tagName`                      | "hould"                  | "should"                             |
| `SouthboundMapping.tagName`                      | "hould"                  | "should"                             |
| `RequestBodyParameterMissingError.parameter`     | "The the missing"        | "The missing"                        |
| `Bridge.cleanStart`                              | "associated the the"     | "associated with the"                |
| `Bridge.clientId`                                | "associated the the"     | "associated with the"                |
| `Bridge.keepAlive`                               | "associated the the"     | "associated with the"                |
| `Bridge.sessionExpiry`, `.password`, `.username` | "associated the the"     | "associated with the"                |

### Part B — Fix garbled descriptions (3 items)

| Location                         | Current                           | Suggested fix                               |
| -------------------------------- | --------------------------------- | ------------------------------------------- |
| `BridgeCustomUserProperty.key`   | "The key the from the property"   | "The key of the custom user property"       |
| `BridgeCustomUserProperty.value` | "The value the from the property" | "The value of the custom user property"     |
| `TopicFilterId` parameter        | "should be deleted"               | "The unique identifier of the topic filter" |

### Part C — Standardize summary/description conventions

Apply these rules across all ~105 operations:

1. **Summaries**: imperative verb phrase, no trailing period, no trailing spaces, < 80 chars
2. **Descriptions**: 1–3 sentences, explain the resource semantics and side effects
3. **Verb consistency**: use "Get" for reads, "Create" for POST, "Update" for PUT, "Delete" for DELETE — not "Obtain", "Add", "List" interchangeably
4. **No redundant summary = description**: if the description adds nothing beyond the summary, expand it or remove it

### Part D — Improve property description quality (by subsystem)

Focus on the weakest subsystems:

1. **UNS / ISA-95** — expand single-word descriptions ("The area", "The site") to explain the ISA-95 hierarchy level and how it maps to the unified namespace
2. **TLS fields** — change "The X from the config" to describe what the field does (e.g., "Password used to access the keystore file")
3. **Adapter** — add descriptions to undescribed properties, especially config-related fields
