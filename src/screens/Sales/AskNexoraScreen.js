import React, { useRef, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView,
  Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../../constants/theme';
import { SALES_ENDPOINTS } from '../../constants/api';
import { apiFetch } from '../../utils/apiFetch';
import common from '../../styles/common';
import { explainApiError } from '../../lib/apiError';

// Ask Nexora — the AI assistant (mirrors the web's components/AskNexora; backend
// sales/assistant.py). Ask in plain words; the server works out which module the
// question is about and answers from what this person can see. Opened from the Home
// dashboard and every module (params.module = where from), for people ticked in
// User Management (Ask Nexora (AI)) and admins.
export const canUseAI = (user) => !!(user && (user.can_use_ai || user.role === 'Admin' || user.is_staff));

const EXAMPLES = {
  sales: ["Show today's site visits", 'How many Meta leads came this week, project-wise?',
    'Which STM has the most pending follow-ups?', 'Why are closures low this month?'],
  cp: ['How many partner leads came this month, partner-wise?', "Show this week's CP site visits",
    'Which partners brought bookings this quarter?'],
  ar: ['How much is overdue, project-wise?', 'Which 10 accounts owe the most?',
    'What collection follow-ups are due today?'],
  execution: ['How many tasks are overdue, by person?', 'What is due this week?', 'Which tasks are blocked?'],
  hr: ['Who is on leave this week?', 'How many leave requests are pending?', 'My attendance this month'],
  club1000: ['How much has been invested this year, scheme-wise?', 'Which payouts are due this month?'],
  dashboard: ["Today's site visits and bookings", 'How much is overdue in AR, project-wise?',
    'How many tasks are overdue?', 'Who is on leave this week?', 'Give me a summary of this month'],
};
const MODULE_NAMES = { sales: 'Sales', cp: 'Channel Partner', ar: 'Accounts Receivable', execution: 'Task Allocation',
  hr: 'HR', club1000: 'Club 1000', accounts: 'Accounts & Finance', purchase: 'Purchase', land: 'Land' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Simple Markdown — paragraphs, bullets, **bold**, tables — as native views.
function Inline({ text, style }) {
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g);
  return (
    <Text style={style}>
      {parts.map((p, i) => (p.startsWith('**') && p.endsWith('**')
        ? <Text key={i} style={s.bold}>{p.slice(2, -2)}</Text> : p))}
    </Text>
  );
}

function Markdown({ text }) {
  const lines = String(text || '').split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*\|.*\|\s*$/.test(line)) {
      const rows = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) { rows.push(lines[i]); i += 1; }
      const cells = (r) => r.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const body = rows.filter((r) => !/^\s*\|[\s:|-]+\|\s*$/.test(r));
      out.push(
        <ScrollView key={`t${i}`} horizontal showsHorizontalScrollIndicator={false} style={s.tableWrap}>
          <View>
            {body.map((r, k) => (
              <View key={k} style={StyleSheet.compose(s.tr, k === 0 && s.trHead)}>
                {cells(r).map((c, j) => <Inline key={j} text={c} style={StyleSheet.compose(s.td, k === 0 && s.th)} />)}
              </View>
            ))}
          </View>
        </ScrollView>,
      );
      continue;
    }
    const bullet = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/);
    if (bullet) {
      out.push(
        <View key={`b${i}`} style={s.li}>
          <Text style={s.liDot}>•</Text>
          <Inline text={bullet[1]} style={s.liText} />
        </View>,
      );
      i += 1; continue;
    }
    const h = line.match(/^\s*#{1,4}\s+(.*)$/);
    if (h) { out.push(<Inline key={`h${i}`} text={h[1]} style={s.h} />); i += 1; continue; }
    if (line.trim()) out.push(<Inline key={`p${i}`} text={line} style={s.p} />);
    i += 1;
  }
  return <View>{out}</View>;
}

export default function AskNexoraScreen({ navigation, route }) {
  const user = useSelector((st) => st.auth.user);
  const companyId = useSelector((st) => st.adminFilter?.companyId);
  const module = route?.params?.module || (route?.params?.cp ? 'cp' : 'dashboard');
  const examples = EXAMPLES[module] || EXAMPLES.dashboard;
  const [turns, setTurns] = useState([]);    // [{ q, a?, err?, busy? }]
  const [text, setText] = useState('');
  const busy = turns.some((t) => t.busy);
  const scroll = useRef(null);

  async function ask(question) {
    const q = question.trim();
    if (!q || busy) return;
    setText('');
    const history = turns.filter((t) => t.a).map((t) => ({ q: t.q, a: t.a }));
    setTurns((ts) => [...ts, { q, busy: true }]);
    const finish = (patch) => setTurns((ts) => ts.map((t, i) => (i === ts.length - 1 ? { ...t, busy: false, ...patch } : t)));
    try {
      const res = await apiFetch(SALES_ENDPOINTS.aiAsk, {
        method: 'POST',
        body: JSON.stringify({ question: q, history, company_id: companyId || null, module }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { finish({ err: explainApiError(res, d, 'Ask Nexora could not take that question.') }); return; }
      for (let n = 0; n < 120; n += 1) {
        await sleep(n < 5 ? 1200 : 2000);
        const r = await apiFetch(SALES_ENDPOINTS.aiAskJob(d.job));
        const st = await r.json().catch(() => ({}));
        if (!r.ok) { finish({ err: explainApiError(r, st, 'Ask Nexora could not answer.') }); return; }
        if (st.status === 'done') { finish({ a: st.answer }); return; }
        if (st.status === 'error') { finish({ err: st.detail || 'Ask Nexora could not answer.' }); return; }
      }
      finish({ err: 'That is taking too long — try a narrower question.' });
    } catch (e) { finish({ err: 'Check your connection and try again.' }); }
  }

  if (!canUseAI(user)) {
    return (
      <SafeAreaView style={common.screen} edges={['top']}>
        <Text style={s.none}>Ask Nexora is not switched on for you. Ask an admin to tick it in User Management.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={common.screen} edges={['top']}>
      <View style={common.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={common.iconBtn}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={s.flex}>
          <Text style={common.headerTitle}>Ask Nexora</Text>
          <Text style={s.sub}>{MODULE_NAMES[module] ? `${MODULE_NAMES[module]} · all your modules` : 'All your modules'} · AI</Text>
        </View>
        {turns.length > 0 && !busy ? (
          <TouchableOpacity onPress={() => setTurns([])}><Text style={s.newChat}>New chat</Text></TouchableOpacity>
        ) : null}
      </View>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={8}>
        <ScrollView ref={scroll} contentContainerStyle={s.body}
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}>
          {turns.length === 0 ? (
            <View>
              <Text style={s.intro}>Ask about anything in your modules (Sales, AR, tasks, HR and more) in plain words. Answers use only what you can see.</Text>
              {examples.map((ex) => (
                <TouchableOpacity key={ex} style={s.example} onPress={() => ask(ex)}>
                  <Ionicons name="sparkles-outline" size={14} color={COLORS.link} />
                  <Text style={s.exampleText}>{ex}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
          {turns.map((t, i) => (
            <View key={i} style={s.turn}>
              <View style={s.q}><Text style={s.qText}>{t.q}</Text></View>
              {t.busy ? (
                <View style={s.a}><View style={s.thinking}><ActivityIndicator size="small" color={COLORS.link} /><Text style={s.thinkingText}>Looking at your data…</Text></View></View>
              ) : null}
              {t.a ? <View style={s.a}><Markdown text={t.a} /></View> : null}
              {t.err ? <View style={StyleSheet.compose(s.a, s.err)}><Text style={s.errText}>{t.err}</Text></View> : null}
            </View>
          ))}
        </ScrollView>
        <View style={s.inputRow}>
          <TextInput style={s.input} value={text} onChangeText={setText} editable={!busy} multiline
            placeholder="Ask a question…" placeholderTextColor={COLORS.textTertiary} />
          <TouchableOpacity style={StyleSheet.compose(s.send, (busy || !text.trim()) && s.sendOff)}
            onPress={() => ask(text)} disabled={busy || !text.trim()}>
            <Ionicons name="send" size={18} color={COLORS.link} />
          </TouchableOpacity>
        </View>
        <Text style={s.foot}>AI can make mistakes — check important numbers on the screens.</Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  sub: { fontSize: 12.5, color: COLORS.textSecondary },
  newChat: { fontSize: 13, fontWeight: '700', color: COLORS.link, paddingHorizontal: 6 },
  none: { padding: 24, fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
  body: { padding: 16, paddingBottom: 24, gap: 14 },
  intro: { fontSize: 13.5, color: COLORS.textSecondary, marginBottom: 12, lineHeight: 19 },
  example: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 11, marginBottom: 8,
             borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  exampleText: { flex: 1, fontSize: 13.5, color: COLORS.textPrimary },
  turn: { gap: 8 },
  q: { alignSelf: 'flex-end', maxWidth: '88%', paddingHorizontal: 13, paddingVertical: 9, borderRadius: 14, borderBottomRightRadius: 4,
       backgroundColor: COLORS.accentSoft, borderWidth: 1, borderColor: COLORS.link },
  qText: { fontSize: 14, color: COLORS.textPrimary },
  a: { alignSelf: 'stretch', paddingHorizontal: 13, paddingVertical: 10, borderRadius: 14, borderBottomLeftRadius: 4,
       backgroundColor: COLORS.surfaceAlt },
  err: { backgroundColor: COLORS.errorBg },
  errText: { fontSize: 13.5, color: COLORS.error },
  thinking: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  thinkingText: { fontSize: 13.5, color: COLORS.textSecondary },
  p: { fontSize: 14, color: COLORS.textPrimary, lineHeight: 20, marginBottom: 6 },
  h: { fontSize: 14.5, fontWeight: '800', color: COLORS.textPrimary, marginTop: 4, marginBottom: 4 },
  bold: { fontWeight: '800' },
  li: { flexDirection: 'row', gap: 6, marginBottom: 4, paddingRight: 8 },
  liDot: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20 },
  liText: { flex: 1, fontSize: 14, color: COLORS.textPrimary, lineHeight: 20 },
  tableWrap: { marginVertical: 6 },
  tr: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  trHead: { borderBottomColor: COLORS.textTertiary },
  td: { minWidth: 86, paddingVertical: 6, paddingRight: 12, fontSize: 12.5, color: COLORS.textPrimary },
  th: { fontWeight: '800', color: COLORS.textSecondary },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingTop: 8,
              borderTopWidth: 1, borderTopColor: COLORS.border },
  input: { flex: 1, minHeight: 44, maxHeight: 120, paddingHorizontal: 12, paddingVertical: 10, borderRadius: RADIUS.lg,
           borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surface, fontSize: 14, color: COLORS.textPrimary },
  send: { width: 46, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
          backgroundColor: COLORS.accentSoft, borderWidth: 1, borderColor: COLORS.link },
  sendOff: { opacity: 0.4 },
  foot: { fontSize: 11, color: COLORS.textSecondary, paddingHorizontal: 14, paddingVertical: 6 },
});
