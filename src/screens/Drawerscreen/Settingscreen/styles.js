import { StyleSheet } from 'react-native';
import { COLORS, CARD_SHADOW } from '../../../constants/theme';

export default StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.screenBg },
  scrollContent: { paddingBottom: 32 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.navy,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: COLORS.white },
  headerRight: { width: 36 },

  profileCard: {
    alignItems: 'center', paddingVertical: 28,
    backgroundColor: COLORS.navy, marginHorizontal: 20, marginTop: 20,
    borderRadius: 18, ...CARD_SHADOW,
  },
  avatarCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#AFD2FA' },
  userName:   { fontSize: 18, fontWeight: '800', color: COLORS.white, marginBottom: 4 },
  userRole:   { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },

  menuCard: {
    marginHorizontal: 20, marginTop: 20,
    backgroundColor: COLORS.cardBg, borderRadius: 18, overflow: 'hidden',
    ...CARD_SHADOW,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  menuIcon: {
    width: 44, height: 44, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  logoutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 20, marginTop: 20,
    backgroundColor: '#FEF2F2', borderWidth: 1.5, borderColor: '#FECACA',
    borderRadius: 14, paddingVertical: 14,
  },
  logoutText: { fontSize: 14, fontWeight: '700', color: '#EF4444' },
});
