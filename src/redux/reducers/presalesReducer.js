import {
  PRESALES_DASHBOARD_REQUEST, PRESALES_DASHBOARD_SUCCESS, PRESALES_DASHBOARD_FAILURE,
  PRESALES_LEADS_REQUEST,     PRESALES_LEADS_SUCCESS,     PRESALES_LEADS_FAILURE,
  PRESALES_PROJECTS_REQUEST,  PRESALES_PROJECTS_SUCCESS,  PRESALES_PROJECTS_FAILURE,
  PRESALES_TEAM_REQUEST,      PRESALES_TEAM_SUCCESS,      PRESALES_TEAM_FAILURE,
} from '../types/presalesTypes';

const initialState = {
  dashboard: {
    loading:        false,
    stats:          null,
    recentLeads:    [],
    teamQueue:      [],
    activeProjects: [],
    error:          null,
  },
  leads:    { loading: false, data: [], error: null },
  projects: { loading: false, data: [], error: null },
  team:     { loading: false, data: [], error: null },
};

export default function presalesReducer(state = initialState, action) {
  switch (action.type) {
    case PRESALES_DASHBOARD_REQUEST:
      return { ...state, dashboard: { ...state.dashboard, loading: true, error: null } };
    case PRESALES_DASHBOARD_SUCCESS:
      return { ...state, dashboard: { loading: false, error: null, ...action.payload } };
    case PRESALES_DASHBOARD_FAILURE:
      return { ...state, dashboard: { ...state.dashboard, loading: false, error: action.payload } };

    case PRESALES_LEADS_REQUEST:
      return { ...state, leads: { ...state.leads, loading: true, error: null } };
    case PRESALES_LEADS_SUCCESS:
      return { ...state, leads: { loading: false, data: action.payload, error: null } };
    case PRESALES_LEADS_FAILURE:
      return { ...state, leads: { loading: false, data: [], error: action.payload } };

    case PRESALES_PROJECTS_REQUEST:
      return { ...state, projects: { ...state.projects, loading: true, error: null } };
    case PRESALES_PROJECTS_SUCCESS:
      return { ...state, projects: { loading: false, data: action.payload, error: null } };
    case PRESALES_PROJECTS_FAILURE:
      return { ...state, projects: { loading: false, data: [], error: action.payload } };

    case PRESALES_TEAM_REQUEST:
      return { ...state, team: { ...state.team, loading: true, error: null } };
    case PRESALES_TEAM_SUCCESS:
      return { ...state, team: { loading: false, data: action.payload, error: null } };
    case PRESALES_TEAM_FAILURE:
      return { ...state, team: { loading: false, data: [], error: action.payload } };

    default:
      return state;
  }
}
