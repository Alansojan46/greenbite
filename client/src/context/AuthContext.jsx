import React, { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api.js";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const storedToken = localStorage.getItem("gb_token");
    const storedUser = localStorage.getItem("gb_user");
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    const { token: jwt, user: userData } = res.data;
    setToken(jwt);
    setUser(userData);
    localStorage.setItem("gb_token", jwt);
    localStorage.setItem("gb_user", JSON.stringify(userData));

    if (userData.role === "donor") navigate("/dashboard/donor");
    else if (userData.role === "ngo") navigate("/dashboard/ngo");
    else navigate("/dashboard");
  };

  const register = async (payload) => {
    const res = await api.post("/auth/register", payload);
    const { token: jwt, user: userData } = res.data;
    setToken(jwt);
    setUser(userData);
    localStorage.setItem("gb_token", jwt);
    localStorage.setItem("gb_user", JSON.stringify(userData));

    if (userData.role === "donor") navigate("/dashboard/donor");
    else if (userData.role === "ngo") navigate("/dashboard/ngo");
    else navigate("/dashboard");
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("gb_token");
    localStorage.removeItem("gb_user");
    navigate("/login");
  };

  const value = { user, token, loading, login, register, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);

