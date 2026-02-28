import { queryOptions, useQuery } from "@tanstack/react-query";

interface AboutResponse {
  content: string;
}

async function fetchAbout(): Promise<AboutResponse> {
  const res = await fetch("/api/about");
  if (!res.ok) throw new Error("Failed to fetch about content");
  return res.json() as Promise<AboutResponse>;
}

export const aboutOptions = () =>
  queryOptions({
    queryKey: ["about"],
    queryFn: fetchAbout,
    staleTime: Infinity,
  });

export function useAbout() {
  return useQuery(aboutOptions());
}
