import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#F5F6FA' },
  content:      { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  screenTitle:  { fontSize: 24, fontWeight: '800', color: '#1A1A2E' },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    margin: 20,
    padding: 15,
    borderRadius: 12,
    gap: 8,
  },
  logoutText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
