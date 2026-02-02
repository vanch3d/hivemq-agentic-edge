import { useEffect, useMemo } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import {
  getAdaptersOptions,
  getBridgesOptions,
  getAllDataPoliciesOptions,
  getAllBehaviorPoliciesOptions,
  getAllSchemasOptions,
  getAllScriptsOptions,
  getCombinersOptions,
  getTopicFiltersOptions,
  getListenersOptions,
  getDomainTagsOptions,
  getNorthboundMappingsOptions,
  getSouthboundMappingsOptions,
  getAdapterDomainTagsOptions,
} from "@/api/@tanstack/react-query.gen";
import type { DomainTag } from "@/api/types.gen";
import { assembleFullGraph, type ApiData } from "./assembler";
import { useGraphStore } from "./store";

/**
 * Fetches all domain entities via TanStack Query and assembles the full
 * domain graph into the Zustand store. Mount this hook in the workspace
 * layout so the graph warms up in the background.
 */
export function useGraphData() {
  // --- Core entity queries ---
  const adapters = useQuery(getAdaptersOptions());
  const bridges = useQuery(getBridgesOptions());
  const dataPolicies = useQuery(getAllDataPoliciesOptions());
  const behaviorPolicies = useQuery(getAllBehaviorPoliciesOptions());
  const schemas = useQuery(getAllSchemasOptions());
  const scripts = useQuery(getAllScriptsOptions());
  const combiners = useQuery(getCombinersOptions());
  const topicFilters = useQuery(getTopicFiltersOptions());
  const listeners = useQuery(getListenersOptions());

  // --- Mapping & tag queries ---
  const domainTags = useQuery(getDomainTagsOptions());
  const northboundMappings = useQuery(getNorthboundMappingsOptions());
  const southboundMappings = useQuery(getSouthboundMappingsOptions());

  // --- Per-adapter domain tags (dynamic queries based on adapter list) ---
  const adapterIds = useMemo(
    () => adapters.data?.items?.map((a) => a.id) ?? [],
    [adapters.data],
  );

  const perAdapterTagQueries = useQueries({
    queries: adapterIds.map((adapterId) => ({
      ...getAdapterDomainTagsOptions({ path: { adapterId } }),
      enabled: adapterIds.length > 0,
    })),
  });

  const coreSettled =
    !adapters.isLoading &&
    !bridges.isLoading &&
    !dataPolicies.isLoading &&
    !behaviorPolicies.isLoading &&
    !schemas.isLoading &&
    !scripts.isLoading &&
    !combiners.isLoading &&
    !topicFilters.isLoading &&
    !listeners.isLoading &&
    !domainTags.isLoading &&
    !northboundMappings.isLoading &&
    !southboundMappings.isLoading;

  const perAdapterSettled =
    adapterIds.length === 0 || perAdapterTagQueries.every((q) => !q.isLoading);

  const allSettled = coreSettled && perAdapterSettled;

  // Build per-adapter tag map
  const adapterTagMap = useMemo(() => {
    if (!perAdapterSettled || adapterIds.length === 0) return undefined;
    const map: Record<string, DomainTag[]> = {};
    adapterIds.forEach((id, i) => {
      const result = perAdapterTagQueries[i];
      if (result?.data?.items) {
        map[id] = result.data.items;
      }
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- we track settlement + ids
  }, [perAdapterSettled, adapterIds]);

  const apiData: ApiData = useMemo(
    () => ({
      adapters: adapters.data?.items,
      bridges: bridges.data?.items,
      dataPolicies: dataPolicies.data?.items,
      behaviorPolicies: behaviorPolicies.data?.items,
      schemas: schemas.data?.items,
      scripts: scripts.data?.items,
      combiners: combiners.data?.items,
      topicFilters: topicFilters.data?.items,
      listeners: listeners.data?.items,
      domainTags: domainTags.data?.items,
      northboundMappings: northboundMappings.data?.items,
      southboundMappings: southboundMappings.data?.items,
      adapterTags: adapterTagMap,
    }),
    [
      adapters.data,
      bridges.data,
      dataPolicies.data,
      behaviorPolicies.data,
      schemas.data,
      scripts.data,
      combiners.data,
      topicFilters.data,
      listeners.data,
      domainTags.data,
      northboundMappings.data,
      southboundMappings.data,
      adapterTagMap,
    ],
  );

  useEffect(() => {
    if (!allSettled) return;

    const { nodes, edges } = assembleFullGraph(apiData);
    useGraphStore.getState().setFullGraph(nodes, edges);
  }, [allSettled, apiData]);

  return {
    isLoading: !allSettled,
    hasError: [
      adapters,
      bridges,
      dataPolicies,
      behaviorPolicies,
      schemas,
      scripts,
      combiners,
      topicFilters,
      listeners,
      domainTags,
      northboundMappings,
      southboundMappings,
    ].some((q) => q.isError),
  };
}
