import {
  TEAM_LEAVES_REQUEST,
  TEAM_LEAVES_SUCCESS,
  TEAM_LEAVES_FAILURE,
} from '../types/teamLeavesTypes';

const initialState = {
  teamLoading: false,
  teamLoadingMore: false,
  teamData: [],
  teamError: null,
  teamPage: 1,
  teamHasMore: false,
};

const mergeSections = (currentSections, nextSections) => {
  const sectionMap = new Map();
  currentSections.forEach((s) => sectionMap.set(s.month, { ...s, data: [...s.data] }));
  nextSections.forEach((s) => {
    const existing = sectionMap.get(s.month);
    if (existing) existing.data = [...existing.data, ...s.data];
    else sectionMap.set(s.month, { ...s, data: [...s.data] });
  });
  return Array.from(sectionMap.values());
};

const teamLeavesReducer = (state = initialState, action) => {
  switch (action.type) {
    case TEAM_LEAVES_REQUEST:
      return {
        ...state,
        teamLoading: action.meta?.page === 1,
        teamLoadingMore: action.meta?.page > 1,
        teamError: null,
      };
    case TEAM_LEAVES_SUCCESS: {
      const page = action.meta?.page ?? 1;
      const isPaginated = !Array.isArray(action.payload);
      const nextData = isPaginated ? action.payload.sections : action.payload;
      return {
        ...state,
        teamLoading: false,
        teamLoadingMore: false,
        teamData: page === 1 ? nextData : mergeSections(state.teamData, nextData),
        teamPage: page,
        teamHasMore: isPaginated ? Boolean(action.payload.next) : false,
      };
    }
    case TEAM_LEAVES_FAILURE:
      return { ...state, teamLoading: false, teamLoadingMore: false, teamError: action.payload };
    default:
      return state;
  }
};

export default teamLeavesReducer;
