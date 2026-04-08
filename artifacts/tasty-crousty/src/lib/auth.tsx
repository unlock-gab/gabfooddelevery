import React, { createContext, useContext, useState, useEffect } from "react";
import { User } from "@workspace/api-client-react";

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("tc_user");
    return saved ? JSON.parse(saved) : null;
  });
  
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem("tc_token") || null;
  });

  const login = (newUser: User, newToken: string) => {
    setUser(newUser);
    setToken(newToken);
    localStorage.setItem("tc_user", JSON.stringify(newUser));
    localStorage.setItem("tc_token", newToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("tc_user");
    localStorage.removeItem("tc_token");
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
