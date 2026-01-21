import { QueryClient, QueryFunction } from "@tanstack/react-query";

export const DB_UNAVAILABLE_CODE = "DB_UNAVAILABLE";

export class DatabaseUnavailableError extends Error {
  code = DB_UNAVAILABLE_CODE;
  isDbUnavailable = true;
  
  constructor(message?: string) {
    super(message || "Database temporarily unavailable. Please try again shortly.");
    this.name = "DatabaseUnavailableError";
  }
}

let dbUnavailableCallback: (() => void) | null = null;

export function setDbUnavailableCallback(callback: () => void) {
  dbUnavailableCallback = callback;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    if (res.status === 503) {
      try {
        const json = await res.clone().json();
        if (json.code === DB_UNAVAILABLE_CODE) {
          if (dbUnavailableCallback) {
            dbUnavailableCallback();
          }
          throw new DatabaseUnavailableError(json.message);
        }
      } catch (e) {
        if (e instanceof DatabaseUnavailableError) throw e;
      }
    }
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Handle FormData (file uploads) differently - don't set Content-Type
  const isFormData = data instanceof FormData;
  
  const res = await fetch(url, {
    method,
    headers: data && !isFormData ? { "Content-Type": "application/json" } : {},
    body: data ? (isFormData ? data : JSON.stringify(data)) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";

function buildUrlFromQueryKey(queryKey: readonly unknown[]): string {
  const parts: string[] = [];
  let params: Record<string, unknown> | null = null;

  for (const part of queryKey) {
    if (typeof part === "string") {
      parts.push(part);
    } else if (typeof part === "object" && part !== null && !Array.isArray(part)) {
      params = part as Record<string, unknown>;
    }
  }

  let url = parts.join("/");
  
  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes("?") ? "&" : "?") + queryString;
    }
  }
  
  return url;
}

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = buildUrlFromQueryKey(queryKey);
    const res = await fetch(url, {
      credentials: "include",
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache",
      },
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
