/**
 * A bar above the whole app while a platform admin is viewing it as someone
 * else. It exists so the admin cannot forget: every action taken from here is
 * recorded against the user they are viewing, and a mistake made in someone
 * else's account is a real mistake in real data.
 *
 * Mirrors web/src/components/ImpersonationBanner.js.
 */
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';

import { COLORS } from '../constants/theme';
import { impersonating, stopImpersonation } from '../lib/impersonate';

export default function ImpersonationBanner() {
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth?.user);
  const [admin, setAdmin] = useState(null);

  // Re-read whenever the signed-in user changes — that is exactly when an
  // impersonation starts or ends.
  useEffect(() => {
    let alive = true;
    impersonating().then((a) => { if (alive) setAdmin(a); });
    return () => { alive = false; };
  }, [user?.id]);

  if (!admin) return null;

  const exit = () => {
    Alert.alert('Exit', `Return to your own account (${admin.name || admin.user_code})?`, [
      { text: 'Stay', style: 'cancel' },
      { text: 'Exit', onPress: () => dispatch(stopImpersonation()) },
    ]);
  };

  return (
    <View style={styles.bar}>
      <View style={styles.dot} />
      <Text style={styles.text} numberOfLines={2}>
        Viewing as <Text style={styles.strong}>{user?.name || 'this user'}</Text> — signed in as{' '}
        {admin.name || admin.user_code}. Anything you do is recorded against them.
      </Text>
      <TouchableOpacity style={styles.exit} onPress={exit} activeOpacity={0.8}>
        <Text style={styles.exitText}>Exit</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row', alignItems: 'center', gap: 9,
    paddingHorizontal: 14, paddingVertical: 9,
    // warningSolid is dark in both themes; plain `warning` is pale in dark mode
    // and would leave the white text unreadable.
    backgroundColor: COLORS.warningSolid,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  text: { flex: 1, fontSize: 11.5, fontWeight: '600', color: '#fff', lineHeight: 16 },
  strong: { fontWeight: '800' },
  exit: {
    paddingHorizontal: 13, paddingVertical: 5, borderRadius: 9,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.6)',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  exitText: { fontSize: 11.5, fontWeight: '700', color: '#fff' },
});
