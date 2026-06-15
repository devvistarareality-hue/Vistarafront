import React, { useEffect } from 'react';
import { View, Image, StatusBar, Animated, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { discoverServer } from '../../utils/serverDiscovery';
import { setBaseUrl, getBaseUrl, isProductionMode } from '../../constants/api';

const ORANGE = '#FF6B2B';

const SplashScreen = ({ onFinish }) => {
  const fadeAnim  = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.7);

  useEffect(() => {
    if (!isProductionMode()) {
      discoverServer(getBaseUrl()).then((url) => {
        if (url) setBaseUrl(url);
      });
    }

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 900, useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1, friction: 4, useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => onFinish(), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" backgroundColor="#050D1A" />

      <LinearGradient
        colors={['#050D1A', '#0C1E3C', '#112240']}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative blobs */}
      <View style={s.blobTop} />
      <View style={s.blobBottom} />

      <View style={s.center}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }], alignItems: 'center' }}>

          {/* Concentric orange rings */}
          <View style={s.ring3}>
            <View style={s.ring2}>
              <View style={s.ring1}>
                <View style={s.logoCircle}>
                  <Image
                    source={require('../../assets/images/image-WBG.png')}
                    style={s.logoImg}
                    resizeMode="contain"
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Divider */}
          <View style={s.dividerRow}>
            <View style={s.dividerLine} />
            <View style={s.dividerDot} />
            <View style={s.dividerLine} />
          </View>

          <Text style={s.brandName}>Vistara</Text>
          <Text style={s.brandTag}>ERP PLATFORM</Text>
          <Text style={s.brandSub}>Real Estate Management</Text>
        </Animated.View>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  blobTop: {
    position: 'absolute', top: -80, right: -60,
    width: 260, height: 260, borderRadius: 130,
    backgroundColor: 'rgba(255,107,43,0.06)',
  },
  blobBottom: {
    position: 'absolute', bottom: -60, left: -80,
    width: 240, height: 240, borderRadius: 120,
    backgroundColor: 'rgba(41,98,255,0.07)',
  },

  ring3: {
    width: 168, height: 168, borderRadius: 84,
    backgroundColor: 'rgba(255,107,43,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,107,43,0.15)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 32,
  },
  ring2: {
    width: 134, height: 134, borderRadius: 67,
    backgroundColor: 'rgba(255,107,43,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,107,43,0.28)',
    justifyContent: 'center', alignItems: 'center',
  },
  ring1: {
    width: 104, height: 104, borderRadius: 52,
    backgroundColor: 'rgba(255,107,43,0.10)',
    borderWidth: 1.5, borderColor: 'rgba(255,107,43,0.55)',
    justifyContent: 'center', alignItems: 'center',
  },
  logoCircle: {
    width: 78, height: 78, borderRadius: 39,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: ORANGE, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 14, elevation: 10,
  },
  logoImg: { width: 60, height: 60 },

  dividerRow: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 18, width: 160,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,107,43,0.35)' },
  dividerDot:  { width: 5, height: 5, borderRadius: 2.5, backgroundColor: ORANGE, marginHorizontal: 8 },

  brandName: {
    fontSize: 38, fontWeight: '800', color: '#FFFFFF',
    letterSpacing: 1, marginBottom: 8,
  },
  brandTag: {
    fontSize: 11, fontWeight: '700', color: ORANGE,
    letterSpacing: 4, marginBottom: 10, textTransform: 'uppercase',
  },
  brandSub: {
    fontSize: 13, color: 'rgba(255,255,255,0.45)',
    fontWeight: '400', letterSpacing: 0.3,
  },
});

export default SplashScreen;
