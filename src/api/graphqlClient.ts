import axios from "axios";

import { authStorage } from "@/lib/auth";

// Derive the GraphQL URL from the REST API base so both stay in sync automatically.
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api").replace(/\/api\/?$/, "");
const GRAPHQL_API = process.env.NEXT_PUBLIC_GRAPHQL_API ?? `${API_BASE}/graphql/`;

const graphqlClient = axios.create({
  baseURL: GRAPHQL_API,
  method: "post",
  headers: { "Content-Type": "application/json" },
});

graphqlClient.interceptors.request.use((config) => {
  const token = authStorage.getToken();
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

export default graphqlClient;
