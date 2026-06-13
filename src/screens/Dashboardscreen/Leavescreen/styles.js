import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const NAVY  = '#182350';
const TEXT  = '#1A1A2E';
const MUTED = '#8492A6';
const LINK  = '#3D5AFE';

const CARD_SHADOW = {
  shadowColor: '#B8C4D6', shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.18, shadowRadius: 12, elevation: 4,
};

export default StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F6FA' },

  header: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F6FA',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  backButton:    { width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginRight: 12, ...CARD_SHADOW },
  backIconImage: { width: 22, height: 22, resizeMode: 'contain', tintColor: TEXT },
  headerTitle:   { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', color: TEXT },
  headerRight:   { width: 38 },

  tabBar: {
    flexDirection: 'row', backgroundColor: '#FFFFFF',
    marginHorizontal: 20, borderRadius: 12, padding: 4, marginBottom: 8,
    ...CARD_SHADOW,
  },
  tabItem:       { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 10 },
  tabLabel:      { fontSize: 13, fontWeight: '600', color: MUTED },
  tabLabelActive:{ color: NAVY, fontWeight: '800' },
  tabIndicator:  {
    position: 'absolute', bottom: 0, height: 0,
    width: '60%', borderRadius: 4, backgroundColor: 'transparent',
  },

  content: { flex: 1, backgroundColor: '#F5F6FA' },

  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: NAVY, justifyContent: 'center', alignItems: 'center',
    shadowColor: NAVY, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.30, shadowRadius: 10, elevation: 6,
  },
  fabIcon: { width: 24, height: 24, resizeMode: 'contain', tintColor: '#FFFFFF' },
});
