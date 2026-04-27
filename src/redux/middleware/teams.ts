import graphqlClient from "@/api/graphqlClient";
import { GetTeamsQuery } from "@/api/graphql/queries/teams";
import { FETCH_TEAMS, FETCH_TEAMS_PENDING } from "@/redux/actions/actionTypes";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fetchTeamsFromGraphQL = async (action: any) => {
  try {
    const result = await graphqlClient({ data: { query: GetTeamsQuery() } });
    if (result.data.errors) {
      action.errors = result.data.errors[0]?.message ?? "Failed to fetch teams";
    } else {
      const teams = result.data.data.teams ?? [];
      action.payload = {
        items: teams.map((t: Record<string, unknown>) => ({
          id: t.id,
          name: t.name,
          slug: t.slug,
          description: t.description,
          player_count: t.playerCount,
          created_at: t.createdAt,
        })),
      };
    }
  } catch (err) {
    action.errors = err instanceof Error ? err.message : "Failed to fetch teams";
  }
  return action;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const teamsMiddleware = (storeAPI: any) => (next: any) => async (action: any) => {
  switch (action.type) {
    case FETCH_TEAMS:
      storeAPI.dispatch({ type: FETCH_TEAMS_PENDING });
      action = await fetchTeamsFromGraphQL(action);
      break;
  }
  return next(action);
};
