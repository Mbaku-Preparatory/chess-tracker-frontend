import axios from "axios";

import { authStorage } from "@/lib/auth";

const GRAPHQL_API =
  process.env.NEXT_PUBLIC_GRAPHQL_API ?? "http://localhost:8000/graphql/";

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
