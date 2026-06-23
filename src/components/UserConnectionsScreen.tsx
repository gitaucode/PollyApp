import { UI } from '@/constants/theme';
import { useAuthActions } from '@/hooks/use-auth';
import { pollpopApi } from '@/lib/api';
import { ConnectionUser } from '@/types/pollpop';
import { BadgeCheck, ChevronLeft } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ConnectionMode = 'followers' | 'following';

function ConnectionRow({
  user,
  onPress,
  onFollow,
  followUpdating,
  showFollow,
}: {
  user: ConnectionUser;
  onPress: () => void;
  onFollow: () => void;
  followUpdating: boolean;
  showFollow: boolean;
}) {
  return (
    <TouchableOpacity style={styles.row} activeOpacity={0.75} onPress={onPress}>
      <Image source={{ uri: user.avatar }} style={styles.avatar} />
      <View style={styles.rowBody}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{user.name}</Text>
          {user.isCreator && (
            <BadgeCheck size={14} color={UI.color.purple} fill={UI.color.purpleSoft} />
          )}
        </View>
        <Text style={styles.handle} numberOfLines={1}>{user.handle}</Text>
      </View>
      {showFollow && (
        <TouchableOpacity
          style={[styles.followBtn, user.isFollowing && styles.followingBtn]}
          onPress={onFollow}
          disabled={followUpdating}
          activeOpacity={0.85}
        >
          <Text style={[styles.followBtnText, user.isFollowing && styles.followingBtnText]}>
            {followUpdating ? '...' : user.isFollowing ? 'Following' : 'Follow'}
          </Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

export default function UserConnectionsScreen({ mode }: { mode: ConnectionMode }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user: currentUser } = useAuthActions();
  const currentUserId = currentUser?.id;
  const [users, setUsers] = useState<ConnectionUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const title = mode === 'followers' ? 'Followers' : 'Following';

  const loadUsers = useCallback(async (refresh = false) => {
    if (!id) return;
    try {
      setError(null);
      if (refresh) setRefreshing(true);
      else setLoading(true);
      const list = mode === 'followers'
        ? await pollpopApi.getFollowers(id)
        : await pollpopApi.getFollowing(id);
      setUsers(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not load ${title.toLowerCase()}.`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, mode, title]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const handleFollow = async (user: ConnectionUser) => {
    if (updatingId) return;
    setUpdatingId(user.id);
    try {
      const following = await pollpopApi.toggleFollow(user.id, !user.isFollowing);
      setUsers((current) =>
        current.map((item) => (item.id === user.id ? { ...item, isFollowing: following } : item)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update follow.');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 14) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} activeOpacity={0.7}>
          <ChevronLeft size={24} color={UI.color.black} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.iconBtn} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={UI.color.purple} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadUsers(true)}
              tintColor={UI.color.purple}
            />
          }
        >
          {users.length === 0 ? (
            <Text style={styles.emptyText}>
              {mode === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
            </Text>
          ) : (
            users.map((user, idx) => (
              <View key={user.id}>
                <ConnectionRow
                  user={user}
                  onPress={() => router.push({ pathname: '/users/[id]', params: { id: user.id } })}
                  onFollow={() => void handleFollow(user)}
                  followUpdating={updatingId === user.id}
                  showFollow={user.id !== currentUserId}
                />
                {idx < users.length - 1 && <View style={styles.divider} />}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: UI.color.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: UI.color.black },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  errorText: { color: '#DC2626', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 24 },
  emptyText: {
    paddingTop: 48,
    textAlign: 'center',
    color: UI.color.subtle,
    fontSize: 14,
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: UI.color.line },
  rowBody: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 15, fontWeight: '700', color: UI.color.black, flexShrink: 1 },
  handle: { fontSize: 13, color: UI.color.subtle, marginTop: 2 },
  followBtn: {
    borderRadius: UI.radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: UI.color.purple,
  },
  followingBtn: {
    backgroundColor: UI.color.purpleSoft,
    borderWidth: 1,
    borderColor: UI.color.purpleLine,
  },
  followBtnText: { fontSize: 12, fontWeight: '700', color: UI.color.white },
  followingBtnText: { color: UI.color.purpleDeep },
  divider: { height: 1, backgroundColor: '#F3F4F6' },
});
