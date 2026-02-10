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
