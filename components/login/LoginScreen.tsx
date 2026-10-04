import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text, TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { useLogin } from './useLogin';

// Native UI. The web UI lives in LoginScreen.web.tsx; Metro picks the right file per platform.

export default function LoginScreen() {
  const {
    members, selected, pin, error, loading, pressPin, deletePin, selectMember,
    online, storedUser, continueAsStored, canSwitch, membersLoading,
  } = useLogin();

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={Colors.blue} />
    </View>
  );

  const userColor = storedUser?.color || Colors.blue;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner}>
        <View style={styles.logoWrap}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoEmoji}>💡</Text>
          </View>
          <Text style={styles.logoTitle}>LED Pro</Text>
          <Text style={styles.logoSub}>Commercial lighting management</Text>
        </View>

        {/* Whoever last logged in on this phone can carry on, with or without signal. */}
        {storedUser && (
          <TouchableOpacity style={[styles.continueCard, { borderColor: userColor }]} onPress={continueAsStored}>
            <View style={[styles.avatar, { backgroundColor: userColor + '22', marginBottom: 0 }]}>
              <Text style={[styles.avatarText, { color: userColor }]}>{storedUser.initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.continueTitle}>Continue as {storedUser.name}</Text>
              <Text style={styles.continueSub}>{online ? 'Logged in on this phone' : 'Works without signal'}</Text>
            </View>
            <Text style={[styles.continueArrow, { color: userColor }]}>→</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.sectionLabel}>{storedUser ? 'Switch user' : 'Who’s logging in?'}</Text>

        {!online ? (
          <View style={styles.offlineBox}>
            <Text style={styles.offlineTitle}>📵 No signal</Text>
            <Text style={styles.offlineText}>
              {storedUser
                ? 'Switching to a different person needs signal. You can continue as yourself above.'
                : 'Log in once with signal on this phone. After that it works without signal.'}
            </Text>
          </View>
        ) : membersLoading ? (
          <ActivityIndicator style={{ marginVertical: 24 }} color={Colors.blue} />
        ) : canSwitch && (
          <>
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
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgSecondary },
  inner: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 40, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  logoWrap: { alignItems: 'center', marginBottom: 28 },
  logoIcon: { width: 64, height: 64, borderRadius: 18, backgroundColor: Colors.blue, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  logoEmoji: { fontSize: 30 },
  logoTitle: { fontSize: 22, fontWeight: '600', color: Colors.textPrimary },
  logoSub: { fontSize: 13, color: Colors.textTertiary, marginTop: 2 },
  continueCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, padding: 14, marginBottom: 24 },
  continueTitle: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  continueSub: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
  continueArrow: { fontSize: 22, fontWeight: '600' },
  offlineBox: { backgroundColor: '#FAEEDA', borderRadius: 12, padding: 14 },
  offlineTitle: { fontSize: 14, fontWeight: '600', color: '#5C3A06', marginBottom: 4 },
  offlineText: { fontSize: 13, color: '#5C3A06', lineHeight: 19 },
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
