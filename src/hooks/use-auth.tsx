import { UI } from '@/constants/theme';
import {
  clearAuthSession,
  getAccessToken,
  hydrateAuthSession,
  saveAuthSession,
  updateAccessToken,
} from '@/lib/auth-storage';
import { pollpopApi, UserProfile } from '@/lib/api';
import { useRouter, useSegments } from 'expo-router';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

export interface AuthUser extends UserProfile {
  email: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const stored = await hydrateAuthSession();
        if (stored.token) {
          const me = await pollpopApi.getMe(stored.token);
          if (!cancelled) {
            await saveAuthSession(me.token, me.user.id);
            setUser(me.user);
          }
        }
      } catch {
        await clearAuthSession();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    const inAuthScreen = segments[0] === 'sign-in' || segments[0] === 'sign-up';
    if (!user && !inAuthScreen) {
      router.replace('/sign-in');
    } else if (user && inAuthScreen) {
      router.replace('/');
    }
  }, [loading, user, segments, router]);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await pollpopApi.login(email, password);
    await saveAuthSession(result.token, result.user.id);
    setUser(result.user);
  }, []);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    const result = await pollpopApi.register(name, email, password);
    await saveAuthSession(result.token, result.user.id);
    setUser(result.user);
  }, []);

  const signOut = useCallback(async () => {
    await clearAuthSession();
    setUser(null);
    router.replace('/sign-in');
  }, [router]);

  const refreshUser = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    const me = await pollpopApi.getMe(token);
    await updateAccessToken(me.token);
    setUser(me.user);
  }, []);

  const value = useMemo(
    () => ({ user, loading, signIn, signUp, signOut, refreshUser }),
    [user, loading, signIn, signUp, signOut, refreshUser],
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={UI.color.purple} size="large" />
      </View>
    );
  }

  const inAuthScreen = segments[0] === 'sign-in' || segments[0] === 'sign-up';
  if (!user && !inAuthScreen) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={UI.color.purple} size="large" />
      </View>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthActions() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuthActions must be used within AuthProvider');
  return context;
}

export function useAuth() {
  const { user, signOut, refreshUser } = useAuthActions();
  if (!user) throw new Error('Not authenticated');
  return { user, userId: user.id, signOut, refreshUser };
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: UI.color.white,
  },
});
