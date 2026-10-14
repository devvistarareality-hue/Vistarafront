// A screen opened from a notification: route.params[key] narrows it to that one
// record (a booking, a project…). Returns [id, clear]. `_n` (set by the notification
// router) makes the same record open again on a second tap. Mirrors the website's
// lib/useFocusId.js.
import { useEffect, useState } from 'react';

export function useFocusParam(route, key) {
  const want = route?.params?.[key];
  const nonce = route?.params?._n;
  const [id, setId] = useState(want ? String(want) : '');
  useEffect(() => { if (want) setId(String(want)); }, [want, nonce]);
  return [id, () => setId('')];
}
