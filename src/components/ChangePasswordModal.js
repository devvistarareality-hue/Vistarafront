import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal } from 'react-native';
import { getBaseUrl } from '../constants/api';
import { apiFetch } from '../utils/apiFetch';
import { COLORS } from '../constants/theme';

// "Change my password" modal — opened from the profile sheet.
export default function ChangePasswordModal({ visible, onClose, onSuccess }) {
  const [cur, setCur]   = useState('');
  const [nw, setNw]     = useState('');
  const [conf, setConf] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg]   = useState(null); // { t: 'ok'|'err', m }

  const close = () => { setCur(''); setNw(''); setConf(''); setMsg(null); onClose(); };

  const submit = async () => {
    setMsg(null);
    if (nw.length < 6) { setMsg({ t: 'err', m: 'New password must be at least 6 characters.' }); return; }
    if (nw !== conf)   { setMsg({ t: 'err', m: 'New passwords do not match.' }); return; }
    setBusy(true);
    try {
      const res = await apiFetch(`${getBaseUrl()}/api/auth/change-password/`, {
        method: 'POST', body: JSON.stringify({ current_password: cur, new_password: nw }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        // Password change invalidates all sessions (web + app) → sign out & re-login.
        setMsg({ t: 'ok', m: 'Password changed. Please sign in again…' });
        setCur(''); setNw(''); setConf('');
        setTimeout(() => (onSuccess ? onSuccess() : close()), 1400);
      }
      else setMsg({ t: 'err', m: d.detail || 'Could not change password.' });
    } catch { setMsg({ t: 'err', m: 'Could not change password.' }); }
    setBusy(false);
  };

  const inp = { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 10, color: COLORS.textPrimary };
  const disabled = busy || !cur || !nw || !conf;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', paddingHorizontal: 24 }}>
        <View style={{ backgroundColor: COLORS.white, borderRadius: 16, padding: 20 }}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: COLORS.textPrimary }}>Change Password</Text>
          <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 2, marginBottom: 14 }}>Enter your current password and choose a new one.</Text>
          <TextInput placeholder="Current password" secureTextEntry value={cur} onChangeText={setCur} style={inp} placeholderTextColor={COLORS.textTertiary} />
          <TextInput placeholder="New password" secureTextEntry value={nw} onChangeText={setNw} style={inp} placeholderTextColor={COLORS.textTertiary} />
          <TextInput placeholder="Confirm new password" secureTextEntry value={conf} onChangeText={setConf} style={inp} placeholderTextColor={COLORS.textTertiary} />
          {msg ? <Text style={{ fontSize: 12, fontWeight: '600', color: msg.t === 'ok' ? COLORS.success : COLORS.error, marginBottom: 8 }}>{msg.m}</Text> : null}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
            <TouchableOpacity onPress={close} style={{ flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center' }}>
              <Text style={{ color: COLORS.textSecondary, fontWeight: '700', fontSize: 13 }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={submit} disabled={disabled} style={{ flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: COLORS.navy, alignItems: 'center', opacity: disabled ? 0.6 : 1 }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{busy ? 'Saving…' : 'Change Password'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
