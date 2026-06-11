/**
 * Authenticated admin API fetch with CSRF header and session cookies.
 */

let csrfToken: string | null = null;

export function setAdminCsrfToken(token: string | null): void {
  csrfToken = token;
}

export function getAdminCsrfToken(): string | null {
  return csrfToken;
}

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export async function adminFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const method = (init?.method ?? "GET").toUpperCase();
  const headers = new Headers(init?.headers);

  if (csrfToken && MUTATING.has(method)) {
    headers.set("X-CSRF-Token", csrfToken);
  }
  if (init?.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  return fetch(input, {
    ...init,
    credentials: init?.credentials ?? "same-origin",
    headers,
  });
}
