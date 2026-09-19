import { createStore, applyMiddleware } from 'redux';
import { thunk } from 'redux-thunk';
import rootReducer from './reducers';
import { cacheUser, clearCachedUser } from '../utils/authCache';
import { clearAllCache } from '../utils/dataCache';

const store = createStore(rootReducer, applyMiddleware(thunk));

// Mirror the signed-in user into AsyncStorage from one place, so every way of
// signing in or out (login, OTP, token refresh, logout) keeps the cache that
// `restoreUser()` reads at launch in sync. Seeded with the current value so the
// first unrelated dispatch does not read as "user became null" and wipe it.
let lastUser = store.getState().auth.user;
store.subscribe(() => {
  const user = store.getState().auth.user;
  if (user === lastUser) return;
  lastUser = user;
  // Cached lists are scoped by company and filters, not by user, so a session
  // change has to drop them or the next person could see the previous one's data.
  clearAllCache();
  if (user) cacheUser(user); else clearCachedUser();
});

export default store;
