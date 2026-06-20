// Global "active company" context for the admin area.
// VRL super-admin picks a company on the Admin screen; every admin module
// (User Management, Designation Master, Sales, …) reads this value.

import AsyncStorage from '@react-native-async-storage/async-storage';

const SET_ADMIN_COMPANY = 'admin/SET_COMPANY';
const STORAGE_KEY = '@vistara_admin_company_id';

const initialState = { companyId: null };

export default function adminFilterReducer(state = initialState, action) {
  switch (action.type) {
    case SET_ADMIN_COMPANY:
      return { ...state, companyId: action.payload };
    default:
      return state;
  }
}

// Thunk: update Redux + persist choice to AsyncStorage
export const setAdminCompany = (companyId) => async (dispatch) => {
  dispatch({ type: SET_ADMIN_COMPANY, payload: companyId });
  try {
    if (companyId == null) {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } else {
      await AsyncStorage.setItem(STORAGE_KEY, String(companyId));
    }
  } catch {}
};

// Thunk: read persisted choice from AsyncStorage on app launch
export const restoreAdminFilter = () => async (dispatch) => {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
      dispatch({ type: SET_ADMIN_COMPANY, payload: parseInt(saved, 10) });
    }
  } catch {}
};
