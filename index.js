import { registerRootComponent } from 'expo';

import Root from './Root';

// registerRootComponent calls AppRegistry.registerComponent('main', () => Root);
// Root reads the saved theme first, then loads App (see Root.js).
registerRootComponent(Root);
