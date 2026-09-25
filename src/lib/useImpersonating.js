import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { impersonating } from './impersonate';

/**
 * True while a platform admin is viewing the app as someone else. Mirrors
 * web/src/lib/useImpersonating.js.
 *
 * Sign Out is hidden then: signing out would throw away the viewed user's session
 * with the admin's own set aside underneath it, stranding them — the banner's Exit
 * is the way back. Re-read whenever the signed-in user changes, which is exactly
 * when an impersonation starts or ends (the banner does the same).
 */
export function useImpersonating() {
  const userId = useSelector((s) => s.auth?.user?.id);
  const [on, setOn] = useState(false);
  useEffect(() => {
    let alive = true;
    impersonating().then((a) => { if (alive) setOn(!!a); });
    return () => { alive = false; };
  }, [userId]);
  return on;
}
