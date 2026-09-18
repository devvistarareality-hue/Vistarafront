import React from 'react';
import { Ionicons } from '@expo/vector-icons';

// One icon set for the whole app (Ionicons), replacing emoji. With no `color` the
// glyph inherits the colour of the <Text> it sits in, so it matches its label.
const ICONS = {
  x: 'close', check: 'checkmark', 'check-circle': 'checkmark-circle', 'x-circle': 'close-circle',
  file: 'document-text-outline', pin: 'location-outline', search: 'search', alert: 'warning-outline',
  download: 'download-outline', building: 'business-outline', settings: 'settings-outline',
  bell: 'notifications-outline', user: 'person-outline', folder: 'folder-open-outline', refresh: 'refresh',
  note: 'create-outline', save: 'save-outline', home: 'home-outline', dot: 'ellipse', trash: 'trash-outline',
  clock: 'time-outline', flame: 'flame-outline', clip: 'attach', clipboard: 'clipboard-outline',
  chart: 'bar-chart-outline', calendar: 'calendar-outline', party: 'sparkles-outline', pencil: 'pencil',
  link: 'link', phone: 'call-outline', book: 'book-outline', users: 'people-outline',
  factory: 'construct-outline', trophy: 'trophy-outline', ban: 'ban', zap: 'flash-outline', menu: 'menu',
  camera: 'camera-outline', idea: 'bulb-outline', hand: 'hand-left-outline', info: 'information-circle-outline',
};

export default function AppIcon({ name, size = 15, color, style }) {
  return <Ionicons name={ICONS[name] || 'information-circle-outline'} size={size} color={color} style={style} />;
}
