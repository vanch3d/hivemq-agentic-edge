/**
 * Parse a HiveMQ metric name into structured parts for display.
 *
 * Naming convention:
 *   com.hivemq.edge.protocol-adapters.{type}.{id}.{...metric}
 *   com.hivemq.edge.bridge.{bridgeId}.{...metric}
 *   com.hivemq.messages.{direction}.{type}.{unit}
 *   com.hivemq.networking.{resource}.{unit}
 *   com.hivemq.system.os.{subsystem}.{resource}.{unit}
 */

export interface ParsedMetric {
  /** Entity scope: "adapter", "bridge", "broker", "networking", "system", or "unknown" */
  scope: string;
  /** Entity identifier (adapter id, bridge id) or undefined for system-level */
  entityId?: string;
  /** Adapter type (e.g. "opcua", "modbus") — only for adapter metrics */
  adapterType?: string;
  /** The metric-specific part (e.g. "read.publish.success.count") */
  metric: string;
  /** Human-readable short label for display */
  label: string;
}

const ADAPTER_PREFIX = "com.hivemq.edge.protocol-adapters.";
const BRIDGE_PREFIX = "com.hivemq.edge.bridge.";
const MESSAGES_PREFIX = "com.hivemq.messages.";
const NETWORKING_PREFIX = "com.hivemq.networking.";
const SYSTEM_PREFIX = "com.hivemq.system.";

export function parseMetricName(name: string): ParsedMetric {
  if (name.startsWith(ADAPTER_PREFIX)) {
    const rest = name.slice(ADAPTER_PREFIX.length);
    const parts = rest.split(".");
    // parts[0] = type, parts[1] = id, parts[2..] = metric
    if (parts.length >= 3) {
      const adapterType = parts[0];
      const entityId = parts[1];
      const metric = parts.slice(2).join(".");
      return {
        scope: "adapter",
        adapterType,
        entityId,
        metric,
        label: `${entityId} — ${humanize(metric)}`,
      };
    }
  }

  if (name.startsWith(BRIDGE_PREFIX)) {
    const rest = name.slice(BRIDGE_PREFIX.length);
    const parts = rest.split(".");
    // parts[0] = bridgeId, parts[1..] = metric
    if (parts.length >= 2) {
      const entityId = parts[0];
      const metric = parts.slice(1).join(".");
      return {
        scope: "bridge",
        entityId,
        metric,
        label: `${entityId} — ${humanize(metric)}`,
      };
    }
  }

  if (name.startsWith(MESSAGES_PREFIX)) {
    const metric = name.slice(MESSAGES_PREFIX.length);
    return {
      scope: "broker",
      metric,
      label: `messages ${humanize(metric)}`,
    };
  }

  if (name.startsWith(NETWORKING_PREFIX)) {
    const metric = name.slice(NETWORKING_PREFIX.length);
    return {
      scope: "networking",
      metric,
      label: `networking ${humanize(metric)}`,
    };
  }

  if (name.startsWith(SYSTEM_PREFIX)) {
    const metric = name.slice(SYSTEM_PREFIX.length);
    return {
      scope: "system",
      metric,
      label: `system ${humanize(metric)}`,
    };
  }

  // Fallback: use last 3 segments
  const segments = name.split(".");
  return {
    scope: "unknown",
    metric: segments.slice(-3).join("."),
    label: segments.slice(-3).join("."),
  };
}

/** Convert dot-separated metric path to readable text: "read.publish.success.count" → "read publish success count" */
function humanize(metric: string): string {
  return metric.replace(/\./g, " ");
}
