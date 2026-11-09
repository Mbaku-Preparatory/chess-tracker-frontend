import graphqlClient from "@/api/graphqlClient";

/** A signed-in GraphQL call: the data, or an Error with the API's message. */
export async function gql<T>(text: string, variables: Record<string, unknown> = {}): Promise<T> {
  const response = await graphqlClient({ data: { query: text, variables } });
  const errors = response.data?.errors;
  if (errors?.length) throw new Error(errors[0].message);
  return response.data.data;
}
