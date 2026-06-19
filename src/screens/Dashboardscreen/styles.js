import { StyleSheet } from 'react-native';
import { COLORS, CARD_SHADOW } from '../../constants/theme';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.screenBg },
  header: {
    backgroundColor: COLORS.navy,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.white },
  logoutBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  content: { flex: 1, padding: 20 },
  welcomeCard: {
    backgroundColor: COLORS.cardBg,
    padding: 24,
    borderRadius: 18,
    marginBottom: 16,
    alignItems: 'center',
    ...CARD_SHADOW,
  },
  welcomeIconRow: { marginBottom: 12 },
  welcomeIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center', alignItems: 'center',
  },
  welcomeTitle: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 12 },
  infoText: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 6 },
  infoValue: { fontWeight: '700', color: COLORS.textPrimary },
  infoBox: {
    backgroundColor: COLORS.navy,
    padding: 20,
    borderRadius: 18,
    alignItems: 'center',
    ...CARD_SHADOW,
  },
  infoBoxText: {
    fontSize: 14,
    color: COLORS.white,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default styles;
