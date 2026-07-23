import axios from "axios";

import { authStorage } from "@/lib/auth";
import { handleAuthFailure } from "@/lib/handleAuthFailure";

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

// The backend always answers an expired/invalid/missing JWT with HTTP 200 and
// a resolver-level `errors: [{ message: "Authentication required" }]` (there's
// no extensions.code to key off - see every resolver in players/schema.py and
// tournaments/schema.py). Only a token the user actually holds triggers this,
// so treat it as "log the user out," not just another inline error message.
graphqlClient.interceptors.response.use((response) => {
  const errors = response?.data?.errors;
  if (
    authStorage.getToken() &&
    Array.isArray(errors) &&
    errors.some((e) => e?.message === "Authentication required")
  ) {
    void handleAuthFailure();
  }
  return response;
});

export default graphqlClient;
