import { createContext, useContext, useEffect, useState, useCallback } from "react";
import authService from "../services/authService";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => authService.getToken());
  const [user, setUser] = useState(() => authService.getUser());
  const [loading, setLoading] = useState(true);

  // Initialize and check current user with backend if token exists
  const checkAuth = useCallback(async () => {
    const savedToken = authService.getToken();
    if (savedToken) {
      try {
        const profile = await authService.getProfile();
        setUser(profile);
        setToken(savedToken);
      } catch (err) {
        console.warn("Session check failed or token expired:", err?.response?.data?.detail || err.message);
        authService.logout();
        setToken(null);
        setUser(null);
      }
    } else {
      setToken(null);
      setUser(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    checkAuth();

    const handleAuthExpired = () => {
      setToken(null);
      setUser(null);
    };

    window.addEventListener("proofmesh-auth-expired", handleAuthExpired);
    window.addEventListener("proofmesh-auth-change", checkAuth);

    return () => {
      window.removeEventListener("proofmesh-auth-expired", handleAuthExpired);
      window.removeEventListener("proofmesh-auth-change", checkAuth);
    };
  }, [checkAuth]);

  const login = async (email, password) => {
    const data = await authService.login(email, password);
    setToken(data.access_token);
    setUser(data.user);
    return data;
  };

  const register = async (username, email, password, fullName = null) => {
    return await authService.register(username, email, password, fullName);
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      setToken(null);
      setUser(null);
    }
  };

  const value = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading: loading,
    login,
    register,
    logout,
    refreshUser: checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export default AuthContext;

