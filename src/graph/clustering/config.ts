import type { ClusterConfig } from "./types";

export const DEFAULT_CLUSTER_CONFIG: ClusterConfig = {
  adapterSubtree: { minTags: 5 },
  orphanTags: { enabled: true },
  orphanResources: { enabled: true },
  topicFilterFanIn: { minSources: 3 },
  topicConvergence: { minPublishers: 3 },
  bridgeSubtree: { minSubscriptions: 2 },
  policyChain: { minOperations: 3 },
};
