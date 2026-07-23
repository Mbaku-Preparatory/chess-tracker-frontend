// Central place for reacting to "the backend no longer accepts this token."
// Kept out of graphqlClient.ts/api.ts's module scope (dynamic imports below)
// so it can safely dispatch into the Redux store without creating an
// import cycle with store.ts -> middleware -> graphqlClient.ts.
let loggingOut = false;

function isPublicAuthPath(pathname: string): boolean {
  return pathname === "/login" || pathname === "/signup";
}

export async function handleAuthFailure() {
  if (typeof window === "undefined") return;
  if (loggingOut) return;
  if (isPublicAuthPath(window.location.pathname)) return;

  loggingOut = true;
  const { store } = await import("@/redux/store");
  const { clearAuth } = await import("@/redux/actions/auth");
  store.dispatch(clearAuth());
  window.location.href = "/login";
}
