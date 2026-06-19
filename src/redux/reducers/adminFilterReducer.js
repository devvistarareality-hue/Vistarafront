// Global "active company" context for the admin area.
// VRL super-admin picks a company on the Admin screen; every admin module
// (User Management, Designation Master, Sales, …) reads this value.

const SET_ADMIN_COMPANY = 'admin/SET_COMPANY';

const initialState = { companyId: null };

export default function adminFilterReducer(state = initialState, action) {
  switch (action.type) {
    case SET_ADMIN_COMPANY:
      return { ...state, companyId: action.payload };
    default:
      return state;
  }
}

export const setAdminCompany = (companyId) => ({ type: SET_ADMIN_COMPANY, payload: companyId });
