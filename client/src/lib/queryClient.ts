import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  console.log(`Making ${method} request to ${url}`, data ? { data } : '');
  
  try {
    const res = await fetch(url, {
      method,
      headers: {
        ...(data ? { "Content-Type": "application/json" } : {}),
        "Accept": "application/json",
      },
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });
    
    console.log(`Response from ${url}:`, { 
      status: res.status, 
      statusText: res.statusText,
      headers: Object.fromEntries(res.headers.entries())
    });
    
    if (res.status === 401) {
      console.warn('Authentication error - redirecting to login');
      return res;
    }
    
    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    console.error(`API request error for ${url}:`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey[0] as string;
    console.log(`Query request to ${url}`);
    
    try {
      const res = await fetch(url, {
        headers: {
          "Accept": "application/json"
        },
        credentials: "include",
      });

      console.log(`Query response from ${url}:`, { 
        status: res.status, 
        statusText: res.statusText
      });
      
      if (res.status === 401) {
        console.warn('Authentication error in query');
        if (unauthorizedBehavior === "returnNull") {
          console.log('Returning null for unauthorized query');
          return null;
        }
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error) {
      console.error(`Query error for ${url}:`, error);
      throw error;
    }
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
