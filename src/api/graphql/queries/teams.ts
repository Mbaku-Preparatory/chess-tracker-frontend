export const GetTeamsQuery = () => `
  query {
    teams {
      id
      name
      slug
      description
      playerCount
      createdAt
    }
  }
`;

export const CreateTeamMutation = (name: string, description = "") => `
  mutation {
    createTeam(name: "${name}", description: "${description}") {
      id
      name
      slug
      description
    }
  }
`;

export const DeleteTeamMutation = (slug: string) => `
  mutation {
    deleteTeam(slug: "${slug}") {
      ok
    }
  }
`;

export const AddPlayerToTeamMutation = (teamSlug: string, playerSlug: string) => `
  mutation {
    addPlayerToTeam(teamSlug: "${teamSlug}", playerSlug: "${playerSlug}") {
      id
      name
      slug
    }
  }
`;

export const RemovePlayerFromTeamMutation = (teamSlug: string, playerRef: string) => `
  mutation {
    removePlayerFromTeam(teamSlug: "${teamSlug}", playerRef: "${playerRef}") {
      ok
    }
  }
`;
