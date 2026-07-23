import axios from "axios";

import { authStorage } from "@/lib/auth";
import { handleAuthFailure } from "@/lib/handleAuthFailure";
import { refreshAccessToken } from "@/lib/refreshAccessToken";

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
// tournaments/schema.py). Try a silent refresh first - only log the user out
// if the refresh token itself is no longer good.
graphqlClient.interceptors.response.use(async (response) => {
  const errors = response?.data?.errors;
  const isAuthError =
    Array.isArray(errors) && errors.some((e) => e?.message === "Authentication required");

  if (!isAuthError || !authStorage.getToken()) {
    return response;
  }

  const config = response.config as typeof response.config & { _retriedAfterRefresh?: boolean };
  if (config._retriedAfterRefresh) {
    void handleAuthFailure();
    return response;
  }

  const newAccessToken = await refreshAccessToken();
  if (!newAccessToken) {
    void handleAuthFailure();
    return response;
  }

  config._retriedAfterRefresh = true;
  return graphqlClient(config);
});

export default graphqlClient;
