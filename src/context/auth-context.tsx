import { createContext, useCallback, useContext, useState } from "react";
import type { ReactNode } from "react";
import { authenticate } from "@/api/sdk.gen";
import { getAuthToken, setAuthToken } from "@/auth-token";

type User = {
  username: string;
  token: string;
};

export type AuthContextValue = {
  isAuthenticated: boolean;
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const existing = getAuthToken();
    return existing ? { username: "", token: existing } : null;
  });

  const login = useCallback(async (username: string, password: string) => {
    const { data, error } = await authenticate({
      body: { userName: username, password },
    });

    if (error || !data?.token) {
      throw new Error("Invalid credentials");
    }

    setAuthToken(data.token);
    setUser({ username, token: data.token });
  }, []);

  const logout = useCallback(() => {
    setAuthToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext
      value={{
        isAuthenticated: user !== null,
        user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext>
  );
}
