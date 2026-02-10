import { GraphQLClient } from "graphql-request";

const REQUEST_TIMEOUT_MS = 30_000;

export function createClient(url: string): GraphQLClient {
  return new GraphQLClient(url, {
    headers: {
      "Content-Type": "application/json",
    },
    fetch: (input, init) =>
      fetch(input, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) }),
  });
}

export async function safePoll<T>(
  client: GraphQLClient,
  query: string,
  variables: Record<string, unknown>,
  label: string
): Promise<T | null> {
  try {
    return await client.request<T>(query, variables);
  } catch (err) {
    console.error(`Failed to poll ${label}:`, err instanceof Error ? err.message : err);
    return null;
  }
}
