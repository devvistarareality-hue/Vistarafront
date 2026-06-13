import { StyleSheet } from 'react-native';
const NAVY = '#182350';
const TEXT = '#1A1A2E';
const MUTED = '#8492A6';
const CARD_SHADOW = {
  shadowColor: '#B8C4D6', shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.18, shadowRadius: 12, elevation: 4,
};
export default StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F5F6FA', paddingHorizontal: 20, paddingVertical: 14, paddingTop: 20,
  },
  headerTitle:  { fontSize: 18, fontWeight: '800', color: TEXT },
  logoutButton: { paddingVertical: 8, paddingHorizontal: 14, backgroundColor: '#FFFFFF', borderRadius: 10, ...CARD_SHADOW },
  logoutText:   { color: TEXT, fontSize: 13, fontWeight: '600' },
  content:      { flex: 1, justifyContent: 'center', alignItems: 'center' },
  screenTitle:  { fontSize: 24, fontWeight: '800', color: TEXT },
});
