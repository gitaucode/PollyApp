import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import BottomNav from '../components/BottomNav';
import { UI } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { pollpopApi, ActivityItem } from '@/lib/api';

const PURPLE = UI.color.purple;
const PURPLE_DARK = UI.color.purpleDark;

// ─── Emoji / tint mapping by type ─────────────────────────────────────────────
const TYPE_META: Record<string, { emoji: string; tint: string }> = {
  votes:     { emoji: '🗳️', tint: '#EEF2FF' },
  follower:  { emoji: '👤', tint: '#F3E8FF' },
  milestone: { emoji: '🏆', tint: '#FFF9ED' },
  trending:  { emoji: '🔥', tint: '#FFF4F0' },
  comment:   { emoji: '💬', tint: '#F0FDF4' },
};
const DEFAULT_META = { emoji: '📣', tint: '#F3F4F6' };

// ─── Activity Row ─────────────────────────────────────────────────────────────
function ActivityRow({ item }: { item: ActivityItem }) {
  const router = useRouter();
  const meta = TYPE_META[item.type] ?? DEFAULT_META;

  const handlePress = () => {
    if (item.pollId) {
      router.push({ pathname: '/results', params: { pollId: item.pollId } });
    }
  };

  return (
    <TouchableOpacity
      style={styles.row}
      activeOpacity={item.pollId ? 0.72 : 1}
      onPress={handlePress}
      disabled={!item.pollId}
    >
      {item.unread && <View style={styles.unreadDot} />}

      <View style={[styles.iconTile, { backgroundColor: meta.tint }]}>
        <Text style={styles.iconEmoji}>{meta.emoji}</Text>
      </View>

      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, item.unread && styles.rowTitleUnread]}>{item.title}</Text>
        <Text style={styles.rowSubtitle} numberOfLines={1}>{item.subtitle}</Text>
      </View>

      <Text style={styles.rowTime}>{item.timeAgo}</Text>
    </TouchableOpacity>
  );
}

// ─── Section Header ────────────────────────────────────────────────────────────
function SectionHeader({ label }: { label: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionLabel}>{label}</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ActivityScreen() {
  const insets = useSafeAreaInsets();
  const { userId } = useAuth();
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadActivity = useCallback(async (refresh = false) => {
    try {
      setError(null);
      if (refresh) setRefreshing(true);
      else setLoading(true);
      const items = await pollpopApi.getActivity(userId);
      setActivity(items);
      if (items.some((item) => item.unread)) {
        await pollpopApi.markActivityRead(userId, { markAll: true });
        setActivity(items.map((item) => ({ ...item, unread: false })));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load activity.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => { void loadActivity(); }, [loadActivity]);

  const unreadCount = activity.filter((a) => a.unread).length;

  // Group into today (first 4) vs earlier — a real app would use date comparison
  const today = activity.slice(0, Math.min(4, activity.length));
  const earlier = activity.slice(Math.min(4, activity.length));

  return (
    <View style={styles.root}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <Text style={styles.headerTitle}>Activity</Text>
        {unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{unreadCount} new</Text>
          </View>
        )}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={UI.color.purple} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : activity.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.centered}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadActivity(true)}
              tintColor={UI.color.purple}
            />
          }
        >
          <Text style={styles.emptyEmoji}>📭</Text>
          <Text style={styles.emptyTitle}>All quiet here</Text>
          <Text style={styles.emptySubtitle}>Activity on your polls will show up here.</Text>
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadActivity(true)}
              tintColor={UI.color.purple}
            />
          }
        >
          {today.length > 0 && (
            <>
              <SectionHeader label="Today" />
              <View style={styles.group}>
                {today.map((item, idx) => (
                  <React.Fragment key={item.id}>
                    <ActivityRow item={item} />
                    {idx < today.length - 1 && <View style={styles.divider} />}
                  </React.Fragment>
                ))}
              </View>
            </>
          )}

          {earlier.length > 0 && (
            <>
              <SectionHeader label="Earlier" />
              <View style={styles.group}>
                {earlier.map((item, idx) => (
                  <React.Fragment key={item.id}>
                    <ActivityRow item={item} />
                    {idx < earlier.length - 1 && <View style={styles.divider} />}
                  </React.Fragment>
                ))}
              </View>
            </>
          )}

          <Text style={styles.privacyNote}>
            Votes are always anonymous. You will never see who voted for what.
          </Text>
        </ScrollView>
      )}

      <BottomNav activeTab="activity" />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: UI.color.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: UI.space.xl,
    paddingBottom: UI.space.md,
    backgroundColor: UI.color.white,
  },
  headerTitle: {
    fontSize: UI.text.hero,
    fontWeight: '700',
    color: UI.color.black,
    letterSpacing: 0,
  },
  unreadBadge: {
    backgroundColor: UI.color.purpleSoft,
    borderRadius: UI.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  unreadBadgeText: { fontSize: 12, fontWeight: '600', color: PURPLE_DARK },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingTop: 60 },
  errorText: { color: '#DC2626', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  emptyEmoji: { fontSize: 40, marginBottom: 14 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: UI.color.black, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: UI.color.subtle, textAlign: 'center', lineHeight: 21 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 108 },
  sectionHeader: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  sectionLabel: {
    fontSize: UI.text.caption,
    fontWeight: '700',
    color: UI.color.subtle,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  group: {
    marginHorizontal: UI.space.lg,
    backgroundColor: UI.color.surface,
    borderRadius: UI.radius.lg,
    borderWidth: 1,
    borderColor: '#F3F0FF',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: UI.space.lg,
    paddingVertical: UI.space.md,
    position: 'relative',
  },
  unreadDot: {
    position: 'absolute',
    left: 6,
    top: '50%',
    marginTop: -4,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: PURPLE,
  },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  iconEmoji: { fontSize: 22 },
  rowBody: { flex: 1 },
  rowTitle: {
    fontSize: UI.text.body,
    fontWeight: '500',
    color: UI.color.ink,
    lineHeight: 20,
    marginBottom: 2,
  },
  rowTitleUnread: { fontWeight: '700', color: UI.color.black },
  rowSubtitle: { fontSize: 12.5, color: UI.color.subtle, fontWeight: '400', lineHeight: 17 },
  rowTime: { fontSize: 11.5, color: '#C4C9D4', fontWeight: '400', marginLeft: 8, flexShrink: 0 },
  divider: { height: 1, backgroundColor: '#EEEBF8', marginHorizontal: 16 },
  privacyNote: {
    marginTop: 24,
    marginHorizontal: 20,
    fontSize: 12.5,
    color: UI.color.subtle,
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '400',
  },
});
