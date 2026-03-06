import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";
// import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider } from "@/components/ui/provider";
import { Toaster } from "@/components/ui/toaster";
import type { AuthContextValue } from "@/context/auth-context";

type RouterContext = {
  auth: AuthContextValue;
};

const queryClient = new QueryClient();

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
});

function RootComponent() {
  return (
    <Provider>
      <QueryClientProvider client={queryClient}>
        <Outlet />
        <Toaster />
        {/*<TanStackRouterDevtools position="top-left" />*/}
      </QueryClientProvider>
    </Provider>
  );
}
