import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { authAPI } from "../services/api";
import { errorMessage } from "../services/reservations";

interface User {
  id: number;
  name: string;
  email: string;
  role: "admin";
}
interface AuthContextType {
  user: User | null;
  loading: boolean;
  isInitialized: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  useEffect(() => {
    const expire = () => setUser(null);
    window.addEventListener("japz-auth-expired", expire);
    return () => window.removeEventListener("japz-auth-expired", expire);
  }, []);
  useEffect(() => {
    let active = true;
    if (!localStorage.getItem("authToken")) {
      setIsInitialized(true);
      return;
    }
    authAPI
      .getCurrentUser()
      .then((response) => {
        if (active) setUser(response.data.user);
      })
      .catch(() => {
        if (active) localStorage.removeItem("authToken");
      })
      .finally(() => {
        if (active) setIsInitialized(true);
      });
    return () => {
      active = false;
    };
  }, []);
  async function login(email: string, password: string) {
    setLoading(true);
    try {
      const response = await authAPI.login(email, password);
      localStorage.setItem("authToken", response.data.token);
      setUser(response.data.user);
    } catch (error) {
      throw new Error(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }
  async function logout() {
    localStorage.removeItem("authToken");
    setUser(null);
    try {
      await authAPI.logout();
    } catch {
      /* Local credentials are already cleared. */
    }
  }
  return (
    <AuthContext.Provider
      value={{ user, loading, isInitialized, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
