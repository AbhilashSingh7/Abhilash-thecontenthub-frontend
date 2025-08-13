import { useState, useEffect, createContext, useContext } from "react";
import { authAPI } from "@/services/api";

// === ADD: bring in token setter from the API bridge (optional but helpful)
import { setAuthToken } from "@/services/api";
// === ADD: token readers/sync helpers =======================================
const _readAnyToken = (): string | null => {
  try {
    return (
      localStorage.getItem("authToken") ||
      localStorage.getItem("token") ||
      sessionStorage.getItem("authToken") ||
      sessionStorage.getItem("token")
    );
  } catch {
    return null;
  }
};

const _syncTokenToPrimary = () => {
  try {
    const current = localStorage.getItem("authToken");
    if (!current) {
      const any = _readAnyToken();
      if (any) {
        localStorage.setItem("authToken", any);
        // keep everything in sync everywhere
        setAuthToken(any);
      }
    }
  } catch {
    /* ignore */
  }
};
// ===========================================================================

interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "user";
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  // === ADD: expose register similar to login
  register: (name: string, email: string, password: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in by verifying token
    const initializeAuth = async () => {
      const token = localStorage.getItem('authToken');
      if (token) {
        try {
          const response = await authAPI.verify();
          if (response.success && response.user) {
            setUser(response.user);
          } else {
            // Invalid token, remove it
            localStorage.removeItem('authToken');
          }
        } catch (error) {
          console.error('Token verification failed:', error);
          localStorage.removeItem('authToken');
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  // === ADD: react to tokens saved under a different key and cross-tab changes
  useEffect(() => {
    // initial sync (handles tokens stored as "token")
    _syncTokenToPrimary();

    // verify if a token appears later in this tab
    let ticks = 0;
    const tick = async () => {
      try {
        _syncTokenToPrimary();
        const t = localStorage.getItem("authToken");
        if (t && !user) {
          // try to refresh user
          const response = await authAPI.verify();
          if (response.success && response.user) {
            setUser(response.user);
          }
        }
      } catch {
        /* ignore */
      }
    };
    const id = setInterval(async () => {
      ticks += 1;
      if (ticks > 60) clearInterval(id); // stop after ~30s
      await tick();
    }, 500);

    const onStorage = async (e: StorageEvent) => {
      if (e.key === "token" || e.key === "authToken") {
        try {
          _syncTokenToPrimary();
          const t = _readAnyToken();
          if (!t) {
            setUser(null);
          } else {
            setAuthToken(t);
            const response = await authAPI.verify();
            if (response.success && response.user) {
              setUser(response.user);
            }
          }
        } catch (err) {
          console.error("Auth sync failed:", err);
        }
      }
    };
    window.addEventListener?.("storage", onStorage);

    return () => {
      clearInterval(id);
      window.removeEventListener?.("storage", onStorage);
    };
  }, [user]);
  // ==========================================================================

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await authAPI.login(email, password);
      
      if (response.success && response.user && response.token) {
        setUser(response.user);
        localStorage.setItem('authToken', response.token);
        // === ADD: keep other keys in sync so fetch layer always sees it
        setAuthToken(response.token);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  // === ADD: register that mirrors login behavior
  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    try {
      const response = await authAPI.register(email, password, name);
      if (response.success && response.user && response.token) {
        setUser(response.user);
        localStorage.setItem("authToken", response.token);
        setAuthToken(response.token);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Registration failed:", error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      setUser(null);
      localStorage.removeItem('authToken');
      // === ADD: also clear any alternate keys
      setAuthToken(null);
      try {
        localStorage.removeItem('token');
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('token');
      } catch {
        /* ignore */
      }
    }
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isAdmin: user?.role === "admin",
    isLoading,
    login,
    logout,
    // === ADD: expose register
    register,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
