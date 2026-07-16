'use client';

import React, { createContext, useContext, useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import { gql } from "@apollo/client";
import { useApolloClient } from "@apollo/client/react";

export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  associatedPersonId?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (usernameOrEmail: string, password: string) => Promise<User>;
  register: (username: string, email: string, password: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOGIN_MUTATION = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      token
      expiration
      user {
        id
        username
        email
        role
        personId
      }
    }
  }
`;

const REGISTER_MUTATION = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      token
      expiration
      user {
        id
        username
        email
        role
        personId
      }
    }
  }
`;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const client = useApolloClient();

  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    if (savedToken) {
      try {
        const decoded: any = jwtDecode(savedToken);
        const exp = decoded.exp * 1000; // exp is in seconds, convert to ms

        if (exp > Date.now()) {
          const userId = decoded.sub || decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"];
          const username = decoded.unique_name || decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] || decoded.name;
          const email = decoded.email || decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"];
          const role = decoded.role || decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];
          const personId = decoded.AssociatedPersonId;

          setToken(savedToken);
          setUser({
            id: userId,
            username: username,
            email: email,
            role: role,
            associatedPersonId: personId || undefined,
          });
        } else {
          // Token expired
          localStorage.removeItem("token");
        }
      } catch (err) {
        console.error("Error decoding token:", err);
        localStorage.removeItem("token");
      }
    }
    setLoading(false);
  }, []);

  const login = async (usernameOrEmail: string, password: string): Promise<User> => {
    const { data } = await client.mutate({
      mutation: LOGIN_MUTATION,
      variables: {
        input: { usernameOrEmail, password },
      },
    });

    if (!data || !data.login) {
      throw new Error("No login data returned from backend.");
    }

    const { token: jwtToken, user: userData } = data.login;
    localStorage.setItem("token", jwtToken);
    setToken(jwtToken);
    
    const formattedUser: User = {
      id: userData.id,
      username: userData.username,
      email: userData.email,
      role: userData.role,
      associatedPersonId: userData.personId || undefined,
    };
    setUser(formattedUser);
    return formattedUser;
  };

  const register = async (username: string, email: string, password: string): Promise<User> => {
    const { data } = await client.mutate({
      mutation: REGISTER_MUTATION,
      variables: {
        input: { username, email, password },
      },
    });

    if (!data || !data.register) {
      throw new Error("No registration data returned from backend.");
    }

    const { token: jwtToken, user: userData } = data.register;
    localStorage.setItem("token", jwtToken);
    setToken(jwtToken);

    const formattedUser: User = {
      id: userData.id,
      username: userData.username,
      email: userData.email,
      role: userData.role,
      associatedPersonId: userData.personId || undefined,
    };
    setUser(formattedUser);
    return formattedUser;
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    client.clearStore();
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
