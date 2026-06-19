import { StyleSheet } from 'react-native';
import { COLORS, CARD_SHADOW } from '../../../constants/theme';

export default StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.screenBg },

  header: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.navy,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: COLORS.white },
  headerRight: { width: 36 },

  tabBar: {
    flexDirection: 'row', backgroundColor: COLORS.cardBg,
    marginHorizontal: 20, borderRadius: 12, padding: 4, marginBottom: 8, marginTop: 12,
    ...CARD_SHADOW,
  },
  tabItem:       { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 10 },
  tabItemActive: { backgroundColor: COLORS.navy },
  tabLabel:      { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  tabLabelActive:{ color: COLORS.white, fontWeight: '800' },

  content: { flex: 1, backgroundColor: COLORS.screenBg },

  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: COLORS.navy, justifyContent: 'center', alignItems: 'center',
    shadowColor: COLORS.navy, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.30, shadowRadius: 10, elevation: 6,
  },
});
