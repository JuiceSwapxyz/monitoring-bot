import { GraphQLClient } from "graphql-request";

export function createClient(url: string): GraphQLClient {
  return new GraphQLClient(url, {
    headers: {
      "Content-Type": "application/json",
    },
  });
}
