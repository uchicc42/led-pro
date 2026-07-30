import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadMembers() {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .order('created_at');
      if (data) {
        setMembers(data);
        setSelected(data[0]);
      }
      setLoading(false);
    }
    loadMembers();
  }, []);

  function pressPin(digit) {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError('');
    if (newPin.length === 4) {
      setTimeout(() => checkPin(newPin), 150);
    }
  }

  function deletePin() {
    setPin(pin.slice(0, -1));
    setError('');
  }

  function checkPin(enteredPin) {
    if (enteredPin === selected.pin_hash) {
      setSuccess(true);
      setError('');
    } else {
      setError('Incorrect PIN — try again');
      setPin('');
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.blue} />
      </View>
    );
  }

  if (success) {
    return (
      <View style={styles.center}>
        <Text style={styles.successText}>Welcome, {selected.name}! ✅</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>

        {/* Logo */}
        <View style={styles.logoWrap}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoEmoji}>💡</Text>
          </View>
          <Text style={styles.logoTitle}>LED Pro</Text>
          <Text style={styles.logoSub}>Commercial lighting management</Text>
        </View>

        {/* User picker */}
        <Text style={styles.sectionLabel}>Who's logging in?</Text>
        <View style={styles.memberRow}>
          {members.map((m) => (
            <TouchableOpacity
              key={m.id}
              style={[styles.memberChip, selected?.id === m.id && styles.memberChipActive]}
              onPress={() => { setSelected(m); setPin(''); setError(''); }}
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

        {/* PIN dots */}
        <View style={styles.dotsRow}>
          {[0, 1, 2, 3].map((i) => (
            <View
              key={i}
              style={[styles.dot, i < pin.length && { backgroundColor: Colors.blue, borderColor: Colors.blue }]}
            />
          ))}
        </View>

        {/* Error */}
        <Text style={styles.errorText}>{error}</Text>

        {/* PIN pad */}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgSecondary },
  inner: { flex: 1, paddingHorizontal: 24, paddingTop: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  successText: { fontSize: 22, color: Colors.green, fontWeight: '500' },
  logoWrap: { alignItems: 'center', marginBottom: 32 },
  logoIcon: { width: 64, height: 64, borderRadius: 18, backgroundColor: Colors.blue, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  logoEmoji: { fontSize: 30 },
  logoTitle: { fontSize: 22, fontWeight: '600', color: Colors.textPrimary },
  logoSub: { fontSize: 13, color: Colors.textTertiary, marginTop: 2 },
  sectionLabel: { fontSize: 11, color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  memberRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  memberChip: { flex: 1, borderWidth: 0.5, borderColor: Colors.borderLight, borderRadius: 12, padding: 10, alignItems: 'center', backgroundColor: Colors.bgPrimary },
  memberChipActive: { borderWidth: 1.5, borderColor: Colors.blue, backgroundColor: '#E6F1FB' },
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