// Ask for the reason behind a rejection or cancellation — the confirm button stays
// disabled until something is written. Use in a screen:
//   const [askReason, reasonUI] = useReasonPrompt();
//   const why = await askReason({ title, message, confirmText, placeholder });  // text or null
//   … and render {reasonUI} once in the screen.
import React, { useRef, useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { COLORS } from '../constants/theme';

export function useReasonPrompt() {
  const [opts, setOpts] = useState(null);
  const [text, setText] = useState('');
  const resolver = useRef(null);

  const ask = (o) => new Promise((resolve) => { resolver.current = resolve; setText(''); setOpts(o || {}); });
  const finish = (v) => { const r = resolver.current; resolver.current = null; setOpts(null); r?.(v); };

  const ui = (
    <Modal visible={!!opts} transparent animationType="fade" onRequestClose={() => finish(null)}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.back}>
        <View style={s.card}>
          <Text style={s.title}>{opts?.title || 'Give a reason'}</Text>
          {!!opts?.message && <Text style={s.msg}>{opts.message}</Text>}
          <TextInput value={text} onChangeText={setText} placeholder={opts?.placeholder || 'Reason (required)'}
            placeholderTextColor={COLORS.text3} multiline autoFocus style={s.input} />
          <View style={s.row}>
            <TouchableOpacity onPress={() => finish(null)} style={s.cancel}><Text style={s.cancelText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => finish(text.trim())} disabled={!text.trim()} style={[s.ok, !text.trim() && s.dim]}>
              <Text style={s.okText}>{opts?.confirmText || 'Confirm'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
  return [ask, ui];
}

const s = StyleSheet.create({
  back: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'center', padding: 22 },
  card: { backgroundColor: COLORS.surface, borderRadius: 18, padding: 18 },
  title: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
  msg: { fontSize: 13, color: COLORS.textSecondary, marginTop: 6 },
  input: { marginTop: 12, minHeight: 80, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12, padding: 12, fontSize: 14, color: COLORS.textPrimary, textAlignVertical: 'top', backgroundColor: COLORS.cardBg },
  row: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 14 },
  cancel: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border },
  cancelText: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  ok: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, backgroundColor: COLORS.error },
  okText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  dim: { opacity: 0.45 },
});
