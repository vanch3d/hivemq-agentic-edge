import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { Provider } from "@/components/ui/provider";
import type { AuthContextValue } from "@/context/auth-context";

type RouterContext = {
  auth: AuthContextValue;
};

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
});

function RootComponent() {
  return (
    <Provider>
      <Outlet />
      <TanStackRouterDevtools position="bottom-right" />
    </Provider>
  );
}
