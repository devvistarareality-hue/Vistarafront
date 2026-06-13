import {
  LEAVE_HISTORY_REQUEST,
  LEAVE_HISTORY_SUCCESS,
  LEAVE_HISTORY_FAILURE,
} from '../types/leaveHistoryTypes';

const initialState = {
  historyLoading: false,
  historyLoadingMore: false,
  historyData:    [],
  historyError:   null,
  historyPage:    1,
  historyHasMore: false,
};

const mergeSections = (currentSections, nextSections) => {
  const sectionMap = new Map();

  currentSections.forEach((section) => {
    sectionMap.set(section.month, { ...section, data: [...section.data] });
  });

  nextSections.forEach((section) => {
    const existing = sectionMap.get(section.month);
    if (existing) {
      existing.data = [...existing.data, ...section.data];
    } else {
      sectionMap.set(section.month, { ...section, data: [...section.data] });
    }
  });

  return Array.from(sectionMap.values());
};

const leaveHistoryReducer = (state = initialState, action) => {
  switch (action.type) {
    case LEAVE_HISTORY_REQUEST:
      return {
        ...state,
        historyLoading: action.meta?.page === 1,
        historyLoadingMore: action.meta?.page > 1,
        historyError: null,
      };
    case LEAVE_HISTORY_SUCCESS: {
      const page = action.meta?.page ?? 1;
      const isPaginated = !Array.isArray(action.payload);
      const nextData = isPaginated ? action.payload.sections : action.payload;
      return {
        ...state,
        historyLoading: false,
        historyLoadingMore: false,
        historyData: page === 1 ? nextData : mergeSections(state.historyData, nextData),
        historyPage: page,
        historyHasMore: isPaginated ? Boolean(action.payload.next) : false,
      };
    }
    case LEAVE_HISTORY_FAILURE:
      return { ...state, historyLoading: false, historyLoadingMore: false, historyError: action.payload };
    default:
      return state;
  }
};

export default leaveHistoryReducer;
