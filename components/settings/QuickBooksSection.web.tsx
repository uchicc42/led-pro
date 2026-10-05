import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, type CSSProperties } from 'react';
import { Colors } from '../../constants/Colors';
import { LEGAL } from '../legal/LegalPage';
import { formatWhen, useQuickBooks } from './useQuickBooks';

// QuickBooks section of Settings (web). Owners connect here: the browser goes to QuickBooks
// to sign in and comes back to this page with ?quickbooks=<result>.

const RETURN_MESSAGES: Record<string, string> = {
  connected: 'QuickBooks connected. Light types are syncing now.',
  cancelled: 'QuickBooks connection was cancelled.',
  expired: 'That QuickBooks sign-in took too long. Please try Connect again.',
  error: 'QuickBooks couldn’t be connected. Please try again.',
};

export default function QuickBooksSection() {
  const { online, status, loaded, canSync, canManage, busy, message, setMessage, error, syncNow, startConnect, disconnect } = useQuickBooks();
  const { quickbooks } = useLocalSearchParams<{ quickbooks?: string }>();

  // Coming back from QuickBooks: show the result once, then tidy the address bar.
  useEffect(() => {
    if (!quickbooks) return;
    setMessage(RETURN_MESSAGES[quickbooks] ?? '');
    router.setParams({ quickbooks: undefined });
  }, [quickbooks]);

  async function connect() {
    const url = await startConnect();
    if (url) window.location.href = url;
  }

  function confirmDisconnect() {
    if (window.confirm('Stop syncing light types from QuickBooks? Types already synced stay in LED Pro.')) disconnect();
  }

  return (
    <div style={s.section}>
      <div style={s.header}>
        <div style={s.icon}>🔗</div>
        <div style={{ flex: 1 }}>
          <div style={s.title}>QuickBooks</div>
          <div style={s.sub}>
            {!loaded ? 'Checking…'
              : status?.connected ? `Connected${status.company_name ? ` to ${status.company_name}` : ''}${status.environment === 'sandbox' ? ' (test company)' : ''}`
              : 'Not connected'}
          </div>
        </div>
        {online && status?.connected && canSync && (
          <button style={{ ...s.syncBtn, opacity: busy ? 0.6 : 1 }} onClick={syncNow} disabled={!!busy}>
            {busy === 'sync' ? 'Syncing…' : '⟳ Sync now'}
          </button>
        )}
      </div>

      <div style={s.body}>
        {!online && <div style={s.hint}>QuickBooks needs a connection.</div>}

        {online && status?.connected && (
          <>
            {status.reconnect_needed && (
              <div style={s.warn}>Access to QuickBooks expired or was removed. An owner needs to connect again.</div>
            )}
            <div style={s.hint}>
              Non-inventory items sync into the New LED light types (automatically each day, or with Sync now).
              Last sync: {formatWhen(status.last_synced_at)}{status.last_sync_result ? ` — ${status.last_sync_result}` : ''}
            </div>
            {canManage && (
              <div style={s.actions}>
                {status.reconnect_needed && <button style={s.connectBtn} onClick={connect} disabled={!!busy}>Reconnect QuickBooks</button>}
                <button style={s.linkDanger} onClick={confirmDisconnect} disabled={!!busy}>Disconnect</button>
              </div>
            )}
          </>
        )}

        {online && loaded && !status?.connected && (
          canManage ? (
            <>
              <div style={s.hint}>
                Connect your QuickBooks Online company to bring your non-inventory items in as New LED light types.
                You&apos;ll sign in to QuickBooks and come straight back here.
              </div>
              <div style={s.actions}>
                <button style={{ ...s.connectBtn, opacity: busy ? 0.6 : 1 }} onClick={connect} disabled={!!busy}>
                  {busy === 'connect' ? 'Opening QuickBooks…' : 'Connect QuickBooks'}
                </button>
              </div>
            </>
          ) : (
            <div style={s.hint}>An owner can connect QuickBooks here.</div>
          )
        )}

        {message && <div style={s.ok}>{message}</div>}
        {error && <div style={s.warn}>{error}</div>}
        <div style={s.support}>
          Problems with QuickBooks? Email <a style={s.link} href={`mailto:${LEGAL.contactEmail}?subject=LED%20Pro%20QuickBooks`}>{LEGAL.contactEmail}</a>
          {' · '}<a style={s.link} href="/privacy">Privacy</a>{' · '}<a style={s.link} href="/terms">Terms</a>
        </div>
      </div>
    </div>
  );
}

const s: Record<string, CSSProperties> = {
  section: { background: '#fff', borderRadius: 14, border: '0.5px solid #e0e7ef', marginBottom: 14, overflow: 'hidden' },
  header: { display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px' },
  icon: { fontSize: 22 },
  title: { fontSize: 15, fontWeight: '500', color: Colors.textPrimary },
  sub: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
  body: { padding: '0 20px 16px', display: 'flex', flexDirection: 'column', gap: 10 },
  hint: { fontSize: 13, color: Colors.textSecondary, lineHeight: '19px' },
  warn: { fontSize: 13, color: '#A32D2D' },
  ok: { fontSize: 13, color: Colors.green },
  actions: { display: 'flex', alignItems: 'center', gap: 12 },
  syncBtn: { padding: '8px 14px', background: '#2CA01C', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: '500', cursor: 'pointer' },
  connectBtn: { padding: '9px 16px', background: '#2CA01C', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: '500', cursor: 'pointer' },
  linkDanger: { background: 'none', border: 'none', color: '#A32D2D', fontSize: 13, cursor: 'pointer', padding: 0 },
  support: { fontSize: 12, color: Colors.textTertiary },
  link: { color: Colors.blue },
};
