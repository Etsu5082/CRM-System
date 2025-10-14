"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedToken = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    // デモモード: バックエンドなしでもログインできるようにする
    if (email === "admin@example.com" && password === "admin123") {
      const mockData = {
        token: "demo-token-" + Date.now(),
        user: {
          id: "demo-user-id",
          email: "admin@example.com",
          name: "管理者",
          role: "ADMIN",
        },
      };

      setToken(mockData.token);
      setUser(mockData.user);

      if (typeof window !== "undefined") {
        localStorage.setItem("token", mockData.token);
        localStorage.setItem("user", JSON.stringify(mockData.user));
      }
      return;
    }

    // 実際のAPIを試行
    const apiUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'https://crm-api-gateway-bjnb.onrender.com/api';
    try {
      const response = await fetch(
        `${apiUrl}/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        }
      );

      if (!response.ok) {
        throw new Error("Login failed");
      }

      const data = await response.json();

      setToken(data.token);
      setUser(data.user);

      if (typeof window !== "undefined") {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
      }
    } catch (error) {
      // APIが使えない場合、モックデータでフォールバック
      console.warn("API unavailable, using demo mode");
      throw new Error("ログインに失敗しました");
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
