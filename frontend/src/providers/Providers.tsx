'use client';

import React from "react";
import { ApolloProvider } from "@apollo/client/react";
import { client } from "../lib/apolloClient";
import { AuthProvider } from "../context/AuthContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ApolloProvider client={client}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </ApolloProvider>
  );
}
