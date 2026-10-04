import { useEffect, type CSSProperties } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { useLogin } from './useLogin';

// Web-only UI built with DOM elements. Metro only bundles this file for web; native uses LoginScreen.tsx.

function clearWebSession() {
  localStorage.removeItem('led_pro_current_session');
}

function focusPinInput() {
  document.getElementById('pin-input')?.focus();
}

export default function LoginScreen() {
  const {
    members, selected, pin, setPin, setError, error, loading,
    checkPin, pressPin, deletePin, selectMember,
    online, storedUser, continueAsStored, canSwitch, membersLoading,
  } = useLogin(clearWebSession);

  useEffect(() => {
    if (!canSwitch) return;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tryFocus = () => {
      const input = document.getElementById('pin-input');
      if (input) input.focus();
      else if (attempts++ < 40) timer = setTimeout(tryFocus, 50);
    };
    timer = setTimeout(tryFocus, 100);
    return () => clearTimeout(timer);
  }, [canSwitch]);

  if (loading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={Colors.blue} />
    </View>
  );

  return (
    <div style={webStyles.page}>
      <div style={webStyles.card} onClick={focusPinInput}>

        <div style={webStyles.logoWrap}>
          <div style={webStyles.logoIcon}>💡</div>
          <div style={webStyles.logoTitle}>LED Pro</div>
          <div style={webStyles.logoSub}>Commercial lighting management</div>
        </div>

        {/* Whoever last logged in on this device can carry on, with or without signal. */}
        {storedUser && (
          <div
            style={{ ...webStyles.continueCard, borderColor: storedUser.color || Colors.blue }}
            onClick={e => { e.stopPropagation(); continueAsStored(); }}
          >
            <div style={{ ...webStyles.avatar, margin: 0, background: (storedUser.color || Colors.blue) + '22', color: storedUser.color || Colors.blue }}>
              {storedUser.initials}
            </div>
            <div style={{ flex: 1 }}>
              <div style={webStyles.continueTitle}>Continue as {storedUser.name}</div>
              <div style={webStyles.continueSub}>{online ? 'Logged in on this device' : 'Works without a connection'}</div>
            </div>
            <div style={{ fontSize: 20, color: storedUser.color || Colors.blue }}>→</div>
          </div>
        )}

        <div style={webStyles.sectionLabel}>{storedUser ? 'Switch user' : 'Who\u2019s logging in?'}</div>

        {!online ? (
          <div style={webStyles.offlineBox}>
            <div style={{ fontWeight: '600', marginBottom: 4 }}>No connection</div>
            {storedUser
              ? 'Switching to a different person needs a connection. You can continue as yourself above.'
              : 'Log in once with a connection on this device. After that it works offline.'}
          </div>
        ) : membersLoading ? (
          <div style={webStyles.offlineBox}>Loading team…</div>
        ) : canSwitch && (
          <>
        <div style={webStyles.memberRow}>
          {members.map((m) => (
            <div
              key={m.id}
              onClick={() => selectMember(m)}
              style={{
                ...webStyles.memberChip,
                ...(selected?.id === m.id ? {
                  border: `2px solid ${m.color}`,
                  background: m.color + '11',
                } : {})
              }}
            >
              <div style={{ ...webStyles.avatar, background: m.color + '22', color: m.color }}>
                {m.initials}
              </div>
              <div style={{ ...webStyles.memberName, color: selected?.id === m.id ? m.color : '#555' }}>
                {m.name}
              </div>
              {m.role === 'owner' && (
                <div style={webStyles.ownerBadge}>Owner</div>
              )}
            </div>
          ))}
        </div>

        <div style={webStyles.dotsRow}>
          {[0,1,2,3].map((i) => (
            <div key={i} style={{
              ...webStyles.dot,
              background: i < pin.length ? Colors.blue : 'transparent',
              borderColor: i < pin.length ? Colors.blue : '#ccc',
            }} />
          ))}
        </div>

        <div style={webStyles.pinHint} onClick={focusPinInput}>
          {error
            ? <span style={{ color: '#A32D2D' }}>{error}</span>
            : pin.length === 0
            ? <span style={{ color: '#aaa' }}>Click here or type your 4-digit PIN</span>
            : <span style={{ color: '#aaa' }}>Keep going...</span>
          }
        </div>

        <input
          id="pin-input"
          type="tel"
          maxLength={4}
          value={pin}
          autoFocus
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, '').slice(0, 4);
            setPin(val);
            setError('');
            if (val.length === 4) setTimeout(() => checkPin(val), 150);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace') deletePin();
          }}
          style={webStyles.hiddenInput}
        />

        <div style={webStyles.pinGrid}>
          {['1','2','3','4','5','6','7','8','9'].map((d) => (
            <div
              key={d}
              style={webStyles.pinBtn}
              onClick={() => { pressPin(d); focusPinInput(); }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f0f5fc'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
            >
              {d}
            </div>
          ))}
          <div style={webStyles.pinEmpty} />
          <div
            style={webStyles.pinBtn}
            onClick={() => { pressPin('0'); focusPinInput(); }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f0f5fc'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
          >
            0
          </div>
          <div
            style={webStyles.pinBtn}
            onClick={() => { deletePin(); focusPinInput(); }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f0f5fc'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
          >
            ⌫
          </div>
        </div>
          </>
        )}

        <div style={webStyles.divider} />
        <div style={webStyles.footer}>LED Pro · Internal use only</div>
      </div>
    </div>
  );
}

const webStyles: Record<string, CSSProperties> = {
  continueCard: { display: 'flex', alignItems: 'center', gap: 12, borderWidth: 1.5, borderStyle: 'solid', borderRadius: 14, padding: '12px 14px', marginBottom: 22, cursor: 'pointer' },
  continueTitle: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  continueSub: { fontSize: 12, color: '#888', marginTop: 2 },
  offlineBox: { background: '#FAEEDA', color: '#5C3A06', borderRadius: 12, padding: '12px 14px', fontSize: 13, lineHeight: '19px', marginBottom: 20 },
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f2942 0%, #1a4a7a 50%, #0f3d2e 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  card: { background: '#fff', borderRadius: 20, padding: '40px 48px', width: 420, boxShadow: '0 24px 60px rgba(0,0,0,0.25)' },
  logoWrap: { textAlign: 'center', marginBottom: 32 },
  logoIcon: { fontSize: 40, marginBottom: 10 },
  logoTitle: { fontSize: 24, fontWeight: '600', color: '#1a1a1a', marginBottom: 4 },
  logoSub: { fontSize: 13, color: '#888' },
  sectionLabel: { fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 },
  memberRow: { display: 'flex', gap: 10, marginBottom: 28 },
  memberChip: { flex: 1, border: '1.5px solid #e0e7ef', borderRadius: 12, padding: '12px 8px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s' },
  avatar: { width: 40, height: 40, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: '600', margin: '0 auto 8px' },
  memberName: { fontSize: 12, fontWeight: '500' },
  ownerBadge: { fontSize: 10, color: '#185FA5', background: '#E6F1FB', padding: '1px 6px', borderRadius: 20, display: 'inline-block', marginTop: 4 },
  dotsRow: { display: 'flex', justifyContent: 'center', gap: 14, marginBottom: 16 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderStyle: 'solid', borderColor: '#ccc', transition: 'all 0.15s' },
  hiddenInput: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: 1,
    height: 1,
    opacity: 0,
    pointerEvents: 'auto',
    zIndex: 9999,
  },
  pinHint: { textAlign: 'center', fontSize: 13, marginBottom: 16, cursor: 'text', minHeight: 20 },
  pinGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 },
  pinBtn: { padding: '16px 0', borderRadius: 10, border: '1px solid #e0e7ef', background: '#fff', fontSize: 20, fontWeight: '500', color: '#1a1a1a', textAlign: 'center', cursor: 'pointer', transition: 'background 0.1s', userSelect: 'none' },
  pinEmpty: { visibility: 'hidden' },
  divider: { borderTop: '1px solid #f0f0f0', marginBottom: 16 },
  footer: { textAlign: 'center', fontSize: 11, color: '#bbb' },
};
