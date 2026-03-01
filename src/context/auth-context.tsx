import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { authenticate } from "@/api/sdk.gen";
import {
  getAuthToken,
  setAuthToken,
  getTokenExpiration,
  getTokenUsername,
} from "@/auth-token";

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
    if (!existing) return null;
    // Discard stale tokens on init
    const exp = getTokenExpiration(existing);
    if (exp !== null && exp <= Date.now()) {
      setAuthToken(null);
      return null;
    }
    return { username: getTokenUsername(existing) ?? "", token: existing };
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

  // --- Token expiration watcher ---
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (!user) return;

    const exp = getTokenExpiration(user.token);
    if (exp === null) return;

    const remaining = exp - Date.now();

    // Use setTimeout for both cases — immediate (0ms) and future expiry —
    // to avoid synchronous setState inside an effect body.
    timerRef.current = setTimeout(
      () => {
        logout();
      },
      Math.max(0, remaining),
    );

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [user, logout]);

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
