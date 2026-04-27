import type { Team } from "@/types";
import {
  FETCH_TEAMS,
  FETCH_TEAMS_PENDING,
} from "@/redux/actions/actionTypes";

interface TeamsState {
  items: Team[];
  loading: boolean;
  error: string | null;
}

const initialState: TeamsState = {
  items: [],
  loading: false,
  error: null,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const teamsReducer = (state = initialState, action: any): TeamsState => {
  switch (action.type) {
    case FETCH_TEAMS_PENDING:
      return { ...state, loading: true, error: null };

    case FETCH_TEAMS:
      if (action.errors) {
        return { ...state, loading: false, error: String(action.errors) };
      }
      return { ...state, loading: false, items: action.payload.items ?? [] };

    default:
      return state;
  }
};

export default teamsReducer;
