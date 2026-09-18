import { COLORS } from './theme';

// Image assets mapping
const LOGO_LIGHT = require('../assets/images/nexora-mark-light.png');
const LOGO_DARK  = require('../assets/images/nexora-mark-dark.png');

const images = {
  // Nexora mark for the current theme: blue on light, ember/white on dark.
  logo:       COLORS.isDark ? LOGO_DARK : LOGO_LIGHT,
  logoLight:  LOGO_LIGHT,
  logoDark:   LOGO_DARK,
  splashLogo: COLORS.isDark ? LOGO_DARK : LOGO_LIGHT,
  backIcon:      require('../assets/icons/Back.png'),
  plusIcon:      require('../assets/icons/plus.png'),
  rightArrow:    require('../assets/icons/right-arrow.png'),
};

export default images;