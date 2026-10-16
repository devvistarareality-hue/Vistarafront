// First: sign-in tokens go to secure storage before anything reads one.
import './src/lib/secureTokens';
import { registerRootComponent } from 'expo';

import Root from './Root';

// registerRootComponent calls AppRegistry.registerComponent('main', () => Root);
// Root reads the saved theme first, then loads App (see Root.js).
registerRootComponent(Root);
