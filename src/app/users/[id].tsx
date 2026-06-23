import { CATEGORY_EMOJI } from '@/constants/categories';
import { UI } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { pollpopApi, UserPollSummary, UserProfile } from '@/lib/api';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BadgeCheck, ChevronLeft } from 'lucide-react-native';
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

function PollRow({ poll }: { poll: UserPollSummary }) {
  const router = useRouter();
  const emoji = CATEGORY_EMOJI[poll.category] ?? '🗳️';

  return (
    <TouchableOpacity
      style={styles.pollRow}
      activeOpacity={0.72}
      onPress={() => router.push({ pathname: '/results', params: { pollId: poll.id } })}
    >
      <View style={styles.pollRowBody}>
        <Text style={styles.pollQuestion} numberOfLines={2}>{poll.question}</Text>
        <View style={styles.pollMeta}>
          <Text style={styles.pollMetaText}>{poll.timeAgo}</Text>
          <View style={styles.metaDot} />
          <Text style={styles.pollMetaText}>{poll.votes} votes</Text>
        </View>
      </View>
      <View style={styles.emojiTile}>
        <Text style={styles.tileEmoji}>{emoji}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function UserProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId: currentUserId } = useAuth();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [polls, setPolls] = useState<UserPollSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [following, setFollowing] = useState(false);
  const [followUpdating, setFollowUpdating] = useState(false);

  useEffect(() => {
    if (id && id === currentUserId) {
      router.replace('/profile');
    }
  }, [id, currentUserId, router]);

  const loadProfile = useCallback(async (refresh = false) => {
    if (!id || id === currentUserId) return;
    try {
      setError(null);
      if (refresh) setRefreshing(true);
      else setLoading(true);
      const [userData, pollsData] = await Promise.all([
        pollpopApi.getUser(id),
        pollpopApi.getUserPolls(id),
      ]);
      setUser(userData);
      setPolls(pollsData);
      setFollowing(userData.isFollowing ?? false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load profile.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, currentUserId]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const handleFollow = async () => {
    if (!id || followUpdating) return;
    setFollowUpdating(true);
    try {
      const nextFollowing = !following;
      await pollpopApi.toggleFollow(id, nextFollowing);
      setFollowing(nextFollowing);
      setUser((prev) =>
        prev
          ? { ...prev, followers: Math.max(0, prev.followers + (nextFollowing ? 1 : -1)) }
          : null,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update follow.');
    } finally {
      setFollowUpdating(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 14) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} activeOpacity={0.7}>
          <ChevronLeft size={24} color={UI.color.black} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{user?.name ?? 'Profile'}</Text>
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
      ) : !user ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>User not found.</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadProfile(true)}
              tintColor={UI.color.purple}
            />
          }
        >
          <View style={styles.profileCard}>
            <LinearGradient
              colors={['#F5F0FF', '#FAF7FF', 'transparent']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.cardTopTint}
              pointerEvents="none"
            />
            <View style={styles.identityRow}>
              <LinearGradient colors={UI.gradient.avatar} style={styles.avatarRing}>
                <View style={styles.avatarInner}>
                  <Image source={{ uri: user.avatar }} style={styles.avatar} />
                </View>
              </LinearGradient>
              <View style={styles.identityText}>
                <View style={styles.nameRow}>
                  <Text style={styles.userName}>{user.name}</Text>
                  {user.isCreator && (
                    <BadgeCheck size={16} color={UI.color.purple} fill={UI.color.purpleSoft} />
                  )}
                </View>
                <Text style={styles.userHandle}>{user.handle}</Text>
              </View>
            </View>
            {!!user.bio && <Text style={styles.userBio}>{user.bio}</Text>}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{user.polls}</Text>
                <Text style={styles.statLabel}>Polls</Text>
              </View>
              <View style={styles.statSep} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{user.followers}</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </View>
              <View style={styles.statSep} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{user.following}</Text>
                <Text style={styles.statLabel}>Following</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.followBtn, following && styles.followingBtn]}
              onPress={handleFollow}
              disabled={followUpdating}
              activeOpacity={0.85}
            >
              <Text style={[styles.followBtnText, following && styles.followingBtnText]}>
                {followUpdating ? '...' : following ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Polls</Text>
          {polls.length === 0 ? (
            <Text style={styles.emptyText}>No polls yet.</Text>
          ) : (
            <View style={styles.pollGroup}>
              {polls.map((poll, idx) => (
                <View key={poll.id}>
                  <PollRow poll={poll} />
                  {idx < polls.length - 1 && <View style={styles.pollDivider} />}
                </View>
              ))}
            </View>
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
    backgroundColor: UI.color.white,
  },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: UI.color.black },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  errorText: { color: '#DC2626', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 32, paddingHorizontal: 16 },
  profileCard: {
    marginTop: 4,
    marginBottom: 20,
    backgroundColor: UI.color.white,
    borderRadius: UI.radius.xl,
    padding: UI.space.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F3F0FF',
    ...UI.shadow.card,
  },
  cardTopTint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
    borderTopLeftRadius: UI.radius.xl,
    borderTopRightRadius: UI.radius.xl,
  },
  identityRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatarRing: { borderRadius: 999, padding: 2.5 },
  avatarInner: { backgroundColor: UI.color.white, borderRadius: 999, padding: 2 },
  avatar: { width: 68, height: 68, borderRadius: 34, backgroundColor: UI.color.line },
  identityText: { marginLeft: 14, flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  userName: { fontSize: 22, fontWeight: '800', color: UI.color.black },
  userHandle: { fontSize: 13, color: UI.color.subtle, fontWeight: '500', marginTop: 2 },
  userBio: { fontSize: 13.5, color: '#4B5563', lineHeight: 20, marginBottom: 16 },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', color: UI.color.black },
  statLabel: { fontSize: 11.5, color: UI.color.subtle, fontWeight: '500', marginTop: 1 },
  statSep: { width: 1, height: 26, backgroundColor: '#F3F4F6' },
  followBtn: {
    borderRadius: UI.radius.pill,
    paddingVertical: 11,
    alignItems: 'center',
    backgroundColor: UI.color.purple,
  },
  followingBtn: {
    backgroundColor: UI.color.purpleSoft,
    borderWidth: 1,
    borderColor: UI.color.purpleLine,
  },
  followBtnText: { fontSize: 14, fontWeight: '700', color: UI.color.white },
  followingBtnText: { color: UI.color.purpleDeep },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: UI.color.black,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  emptyText: {
    paddingHorizontal: 4,
    paddingTop: 8,
    color: UI.color.subtle,
    fontSize: 14,
    fontWeight: '500',
  },
  pollGroup: {
    backgroundColor: '#FAFAFA',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F3F0FF',
    overflow: 'hidden',
  },
  pollRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  pollRowBody: { flex: 1, marginRight: 12 },
  pollQuestion: { fontSize: 14, fontWeight: '600', color: '#111827', lineHeight: 20, marginBottom: 5 },
  pollMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pollMetaText: { fontSize: 12, color: '#9CA3AF' },
  metaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#D1D5DB' },
  emojiTile: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3E8FF',
  },
  tileEmoji: { fontSize: 24 },
  pollDivider: { height: 1, backgroundColor: '#EEEBF8', marginHorizontal: 16 },
});
