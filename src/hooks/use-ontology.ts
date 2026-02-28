import { queryOptions, useQuery } from "@tanstack/react-query";

interface OntologyModule {
  id: string;
  name: string;
  description: string;
}

interface OntologyModuleDetail extends OntologyModule {
  content: string;
}

async function fetchOntologyModules(): Promise<OntologyModule[]> {
  const res = await fetch("/api/ontology");
  if (!res.ok) throw new Error("Failed to fetch ontology modules");
  return res.json() as Promise<OntologyModule[]>;
}

async function fetchOntologyModule(id: string): Promise<OntologyModuleDetail> {
  const res = await fetch(`/api/ontology/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch ontology module: ${id}`);
  return res.json() as Promise<OntologyModuleDetail>;
}

export const ontologyListOptions = () =>
  queryOptions({
    queryKey: ["ontology"],
    queryFn: fetchOntologyModules,
  });

export const ontologyModuleOptions = (id: string) =>
  queryOptions({
    queryKey: ["ontology", id],
    queryFn: () => fetchOntologyModule(id),
  });

export function useOntologyList() {
  return useQuery(ontologyListOptions());
}

export function useOntologyModule(id: string) {
  return useQuery(ontologyModuleOptions(id));
}
