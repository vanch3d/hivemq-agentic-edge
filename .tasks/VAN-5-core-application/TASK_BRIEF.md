# Task 00001: Core Application

## Objective

Replace the default Vite+React template with a core application shell using Chakra UI v3 and TanStack Router.

## Requirements

- **UI Library**: Chakra UI v3 (`@chakra-ui/react`, `@emotion/react`)
- **Routing**: TanStack Router with file-based routing (`@tanstack/react-router`, `@tanstack/router-plugin`)
- **Pages**:
  - **Login** — public route at `/login`, simple username/password form
  - **Workspace** — authenticated route at `/workspace`, with toolbar, sidebar, and main content outlet
- **Workspace Layout**:
  - Top toolbar: app name, light/dark mode toggle (Chakra `ColorModeButton`), user dropdown menu with logout
  - Sidebar: navigation links, logout button at bottom
  - Main content area: router `<Outlet />` for child routes
- **Auth**: Mock auth context (`AuthProvider` + `useAuth`) with `login`/`logout` and `isAuthenticated` state
- **Auth Guard**: Unauthenticated users are redirected to `/login`; authenticated users on `/login` are redirected to `/workspace`

## Additional Requests

- Install Prettier and configure with ESLint via `eslint-config-prettier`
- Add `format:check`, `format:write`, and `lint:all` npm scripts
- Auth uses username (not email)
