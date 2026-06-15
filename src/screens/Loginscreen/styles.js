import { StyleSheet, Dimensions } from 'react-native';

const { height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#182350' },
  scroll:    { flexGrow: 1 },

  // ── Header Banner ──
  header: {
    backgroundColor: '#182350',
    alignItems: 'center',
    paddingTop: 64,
    paddingBottom: 44,
    paddingHorizontal: 20,
  },
  logoBox: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 10, elevation: 6,
  },
  logoImg: {
    width: 56, height: 56, borderRadius: 14,
  },
  brandName: { fontSize: 34, fontWeight: '800', color: '#FFFFFF', marginBottom: 6 },
  brandTag:  {
    fontSize: 12, fontWeight: '700', color: '#AFD2FA',
    letterSpacing: 3, marginBottom: 8, textTransform: 'uppercase',
  },
  brandSub: { fontSize: 13, color: 'rgba(255,255,255,0.50)' },

  // ── Form Card ──
  card: {
    flex: 1,
    backgroundColor: '#F5F6FA',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 48,
    minHeight: height * 0.58,
  },
  cardTitle: { fontSize: 26, fontWeight: '800', color: '#1A1A2E', marginBottom: 6 },
  cardSub:   { fontSize: 13, color: '#8492A6', fontWeight: '500', marginBottom: 32 },

  // ── Fields ──
  fieldLabel: {
    fontSize: 11, fontWeight: '600', color: '#8492A6',
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 16,
    paddingHorizontal: 16, height: 54, marginBottom: 22,
    shadowColor: '#B8C4D6', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18, shadowRadius: 10, elevation: 3,
  },
  inputIcon: { marginRight: 12 },
  input: {
    flex: 1, fontSize: 15, color: '#1A1A2E', fontWeight: '500',
  },
  eyeBtn: { padding: 6 },

  // ── Button ──
  btn: {
    backgroundColor: '#182350',
    borderRadius: 16, height: 54,
    justifyContent: 'center', alignItems: 'center',
    marginTop: 4,
    shadowColor: '#182350', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28, shadowRadius: 10, elevation: 4,
  },
  btnDisabled: {
    backgroundColor: '#B0BAC9',
    shadowOpacity: 0, elevation: 0,
  },
  btnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  // ── Back ──
  backBtn: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', marginTop: 20, paddingVertical: 8,
  },
  backText: { fontSize: 13, color: '#8492A6', fontWeight: '500' },

  // ── Register ──
  registerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 12 },
  registerText: { fontSize: 13, color: '#8492A6' },
  registerLink: { fontSize: 13, fontWeight: '700', color: '#3D5AFE' },
});

export default styles;
