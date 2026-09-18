import { createStore, applyMiddleware } from 'redux';
import { thunk } from 'redux-thunk';
import rootReducer from './reducers';
import { cacheUser, clearCachedUser } from '../utils/authCache';

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
  if (user) cacheUser(user); else clearCachedUser();
});

export default store;
