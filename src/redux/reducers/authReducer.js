import {
  COMPANY_VERIFY_REQUEST,
  COMPANY_VERIFY_SUCCESS,
  COMPANY_VERIFY_FAILURE,
  LOGIN_REQUEST,
  LOGIN_SUCCESS,
  LOGIN_FAILURE,
  LOGOUT,
} from '../types/authTypes';

const initialState = {
  // company verify
  companyLoading: false,
  company: null,         // { code, name, logo_url }
  companyError: null,

  // login
  loginLoading: false,
  user: null,            // { name, user_code, role, department, ... }
  token: null,
  loginError: null,
};

const authReducer = (state = initialState, action) => {
  switch (action.type) {

    // ── Company Verify ──────────────────────────────
    case COMPANY_VERIFY_REQUEST:
      return { ...state, companyLoading: true, companyError: null, company: null };

    case COMPANY_VERIFY_SUCCESS:
      return { ...state, companyLoading: false, company: action.payload };

    case COMPANY_VERIFY_FAILURE:
      return { ...state, companyLoading: false, companyError: action.payload };

    // ── Login ───────────────────────────────────────
    case LOGIN_REQUEST:
      return { ...state, loginLoading: true, loginError: null };

    case LOGIN_SUCCESS:
      return { ...state, loginLoading: false, user: action.payload, token: action.payload.token };

    case LOGIN_FAILURE:
      return { ...state, loginLoading: false, loginError: action.payload };

    // ── Logout ──────────────────────────────────────
    case LOGOUT:
      return { ...initialState };

    default:
      return state;
  }
};

export default authReducer;
