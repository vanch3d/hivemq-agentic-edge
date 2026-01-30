import type { ProblemDetails } from "@/api/types.gen";

export const unauthorizedError: ProblemDetails = {
  title: "Unauthorized",
  type: "about:blank",
  status: 401,
};
