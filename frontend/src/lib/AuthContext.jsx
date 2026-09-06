import { createContext, useContext, useState, useCallback } from "react";
import { api, getToken, setToken } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(getToken());

  const login = useCallback(async (username, password) => {
    const { access_token } = await api.login(username, password);
    setToken(access_token);
    setTokenState(access_token);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setTokenState(null);
  }, []);

  return <AuthContext.Provider value={{ token, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
