import { UI } from '@/constants/theme';
import { useAuthActions } from '@/hooks/use-auth';
import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const { signIn } = useAuthActions();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSignIn = async () => {
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email.trim().toLowerCase(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: Math.max(insets.top, 24), paddingBottom: Math.max(insets.bottom, 24) },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.logo}>PollyPop</Text>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to vote, create polls, and follow creators.</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="you@example.com"
            placeholderTextColor="#BDBDBD"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Your password"
            placeholderTextColor="#BDBDBD"
          />
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.demoBox}>
          <Text style={styles.demoTitle}>Demo account</Text>
          <Text style={styles.demoText}>demo@pollpop.app</Text>
          <Text style={styles.demoText}>PollyPop123!</Text>
        </View>

        <TouchableOpacity activeOpacity={0.9} onPress={handleSignIn} disabled={submitting}>
          <LinearGradient colors={UI.gradient.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.button}>
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign in</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.footer}>
          New here?{' '}
          <Link href="/sign-up" style={styles.link}>
            Create an account
          </Link>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: UI.color.white },
  content: { flexGrow: 1, paddingHorizontal: 24, justifyContent: 'center' },
  logo: { fontSize: 32, fontWeight: '900', color: UI.color.purple, marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '800', color: UI.color.black, marginBottom: 8 },
  subtitle: { fontSize: 15, color: UI.color.muted, lineHeight: 22, marginBottom: 28 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: UI.color.ink, marginBottom: 8 },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: UI.color.black,
  },
  error: { color: '#DC2626', fontSize: 13, fontWeight: '600', marginBottom: 12 },
  demoBox: {
    backgroundColor: '#F5F0FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    padding: 14,
    marginBottom: 16,
  },
  demoTitle: { fontSize: 12, fontWeight: '700', color: UI.color.purpleDark, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 },
  demoText: { fontSize: 13, color: UI.color.ink, fontWeight: '600', lineHeight: 20 },
  button: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  footer: { marginTop: 24, textAlign: 'center', fontSize: 14, color: UI.color.muted },
  link: { color: UI.color.purpleDark, fontWeight: '700' },
});
