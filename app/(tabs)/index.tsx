import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Platform,
  SafeAreaView,
  StyleSheet,
  Text, TouchableOpacity,
  View
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../supabase';

export default function LoginScreen() {
  const [members, setMembers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMembers() {
      const { data } = await supabase
        .from('team_members')
        .select('*')
        .order('created_at');
      if (data) { setMembers(data); setSelected(data[0]); }
      setLoading(false);
    }
    loadMembers();
  }, []);
  useEffect(() => {
    if (Platform.OS === 'web') {
      const tryFocus = () => {
        const input = document.getElementById('pin-input');
        if (input) {
          input.focus();
        } else {
          setTimeout(tryFocus, 50);
        }
      };
      setTimeout(tryFocus, 100);
    }
  }, []);

  const checkPin = useCallback((enteredPin) => {
    if (enteredPin === selected?.pin_hash) {
      router.replace('/home');
    } else {
      setError('Incorrect PIN — try again');
      setPin('');
    }
  }, [selected]);

  function pressPin(digit) {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError('');
    if (newPin.length === 4) setTimeout(() => checkPin(newPin), 150);
  }

  function deletePin() {
    setPin(pin.slice(0, -1));
    setError('');
  }

  function selectMember(m) {
    setSelected(m);
    setPin('');
    setError('');
  }

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={Colors.blue} />
    </View>
  );

  // ── WEB VERSION ─────────────────────────────────────────
  if (Platform.OS === 'web') {
    return (
      <div style={webStyles.page}>
        <div style={webStyles.card} onClick={() => document.getElementById('pin-input')?.focus()}>

          <div style={webStyles.logoWrap}>
            <div style={webStyles.logoIcon}>💡</div>
            <div style={webStyles.logoTitle}>LED Pro</div>
            <div style={webStyles.logoSub}>Commercial lighting management</div>
          </div>

          <div style={webStyles.sectionLabel}>Who's logging in?</div>
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

          <div
            style={webStyles.pinHint}
            onClick={() => document.getElementById('pin-input')?.focus()}
          >
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
            onFocus={() => {}}
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
                onClick={() => {
                  pressPin(d);
                  document.getElementById('pin-input').focus();
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#f0f5fc'}
                onMouseLeave={e => e.currentTarget.style.background = '#fff'}
              >
                {d}
              </div>
            ))}
            <div style={webStyles.pinEmpty} />
            <div
              style={webStyles.pinBtn}
              onClick={() => {
                pressPin('0');
                document.getElementById('pin-input').focus();
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f0f5fc'}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}
            >
              0
            </div>
            <div
              style={webStyles.pinBtn}
              onClick={() => {
                deletePin();
                document.getElementById('pin-input').focus();
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f0f5fc'}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}
            >
              ⌫
            </div>
          </div>

          <div style={webStyles.divider} />
          <div style={webStyles.footer}>LED Pro · Internal use only</div>
        </div>
      </div>
    );
  }

  // ── MOBILE VERSION ───────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <View style={styles.logoWrap}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoEmoji}>💡</Text>
          </View>
          <Text style={styles.logoTitle}>LED Pro</Text>
          <Text style={styles.logoSub}>Commercial lighting management</Text>
        </View>

        <Text style={styles.sectionLabel}>Who's logging in?</Text>
        <View style={styles.memberRow}>
          {members.map((m) => (
            <TouchableOpacity
              key={m.id}
              style={[styles.memberChip, selected?.id === m.id && { borderColor: m.color, borderWidth: 1.5, backgroundColor: m.color + '11' }]}
              onPress={() => selectMember(m)}
            >
              <View style={[styles.avatar, { backgroundColor: m.color + '22' }]}>
                <Text style={[styles.avatarText, { color: m.color }]}>{m.initials}</Text>
              </View>
              <Text style={[styles.memberName, selected?.id === m.id && { color: m.color }]}>
                {m.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.dotsRow}>
          {[0,1,2,3].map((i) => (
            <View key={i} style={[styles.dot, i < pin.length && { backgroundColor: Colors.blue, borderColor: Colors.blue }]} />
          ))}
        </View>

        <Text style={styles.errorText}>{error}</Text>

        <View style={styles.pinGrid}>
          {['1','2','3','4','5','6','7','8','9'].map((d) => (
            <TouchableOpacity key={d} style={styles.pinBtn} onPress={() => pressPin(d)}>
              <Text style={styles.pinText}>{d}</Text>
            </TouchableOpacity>
          ))}
          <View style={styles.pinEmpty} />
          <TouchableOpacity style={styles.pinBtn} onPress={() => pressPin('0')}>
            <Text style={styles.pinText}>0</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.pinBtn} onPress={deletePin}>
            <Text style={styles.pinText}>⌫</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const webStyles = {
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
  dot: { width: 14, height: 14, borderRadius: 7, border: '1.5px solid #ccc', transition: 'all 0.15s' },
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgSecondary },
  inner: { flex: 1, paddingHorizontal: 24, paddingTop: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  logoWrap: { alignItems: 'center', marginBottom: 32 },
  logoIcon: { width: 64, height: 64, borderRadius: 18, backgroundColor: Colors.blue, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  logoEmoji: { fontSize: 30 },
  logoTitle: { fontSize: 22, fontWeight: '600', color: Colors.textPrimary },
  logoSub: { fontSize: 13, color: Colors.textTertiary, marginTop: 2 },
  sectionLabel: { fontSize: 11, color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  memberRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  memberChip: { flex: 1, borderWidth: 0.5, borderColor: Colors.borderLight, borderRadius: 12, padding: 10, alignItems: 'center', backgroundColor: Colors.bgPrimary },
  avatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  avatarText: { fontSize: 12, fontWeight: '600' },
  memberName: { fontSize: 11, color: Colors.textSecondary },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 14, marginBottom: 8 },
  dot: { width: 13, height: 13, borderRadius: 7, borderWidth: 1.5, borderColor: Colors.borderLight, backgroundColor: 'transparent' },
  errorText: { fontSize: 12, color: '#A32D2D', textAlign: 'center', minHeight: 18, marginBottom: 8 },
  pinGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pinBtn: { width: '30%', paddingVertical: 16, borderRadius: 10, borderWidth: 0.5, borderColor: Colors.borderLight, backgroundColor: Colors.bgPrimary, alignItems: 'center' },
  pinEmpty: { width: '30%' },
  pinText: { fontSize: 22, fontWeight: '500', color: Colors.textPrimary },
});