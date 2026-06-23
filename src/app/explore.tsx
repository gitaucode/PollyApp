import { UI } from '@/constants/theme';
import { pollpopApi } from '@/lib/api';
import { CreatorSummary, Poll } from '@/types/pollpop';
import { LinearGradient } from 'expo-linear-gradient';
import { BarChart2, ChevronRight, Flame, Heart, Search, Sparkles, Users, WalletCards } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomNav from '../components/BottomNav';

const CATEGORIES = [
  { id: 'dating', label: 'Dating', icon: Heart, tint: '#F5F0FF', border: '#DDD6FE', accent: UI.color.purpleDark },
  { id: 'hot-takes', label: 'Hot Takes', icon: Flame, tint: '#FFF7ED', border: '#FED7AA', accent: '#EA580C' },
  { id: 'friendship', label: 'Friendship', icon: Users, tint: '#F0FDF4', border: '#BBF7D0', accent: '#16A34A' },
  { id: 'money', label: 'Money', icon: WalletCards, tint: '#FEFCE8', border: '#FDE68A', accent: '#D97706' },
  { id: 'random', label: 'Random', icon: Sparkles, tint: '#EFF6FF', border: '#BFDBFE', accent: '#2563EB' },
];

function CategoryChip({ cat, active, onPress }: { cat: typeof CATEGORIES[0]; active: boolean; onPress: () => void }) {
  const Icon = cat.icon;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[styles.chip, { backgroundColor: cat.tint, borderColor: active ? cat.accent : cat.border }]}
    >
      <Icon size={13} color={cat.accent} strokeWidth={2.4} />
      <Text style={[styles.chipLabel, { color: active ? cat.accent : UI.color.ink }]}>{cat.label}</Text>
    </TouchableOpacity>
  );
}

function SectionHeader({ title, action }: { title: string; action?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && <Text style={styles.sectionAction}>{action}</Text>}
    </View>
  );
}

function TrendingCard({ item, isLast }: { item: Poll; isLast: boolean }) {
  const router = useRouter() as any;
  return (
    <TouchableOpacity
      activeOpacity={0.78}
      style={[styles.trendingRow, !isLast && styles.trendingBorder]}
      onPress={() => router.push({ pathname: '/results', params: { pollId: item.id } })}
    >
      <View style={styles.trendingBody}>
        <View style={styles.authorRow}>
          <Image source={{ uri: item.creator.avatar }} style={styles.smallAvatar} />
          <Text style={styles.authorText}>{item.creator.name}</Text>
          <View style={styles.metaDot} />
          <Text style={styles.timeText}>{item.timeAgo}</Text>
        </View>
        <Text style={styles.questionText} numberOfLines={2}>{item.question}</Text>
        <View style={styles.voteRow}>
          <BarChart2 size={12} color={UI.color.purple} strokeWidth={2.5} />
          <Text style={styles.votesText}>{item.votes} votes</Text>
        </View>
      </View>
      <View style={[styles.trendingTile, { backgroundColor: '#F3E8FF' }]}>
        <ChevronRight size={20} color={UI.color.purpleDark} />
      </View>
    </TouchableOpacity>
  );
}

function CreatorCard({ creator }: { creator: CreatorSummary }) {
  const [following, setFollowing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleFollow = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      const newFollowing = !following;
      await pollpopApi.toggleFollow(creator.id, 'u0', newFollowing);
      setFollowing(newFollowing);
    } catch (err) {
      console.error('Follow failed:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <View style={styles.creatorCard}>
      <LinearGradient colors={UI.gradient.avatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.creatorRing}>
        <View style={styles.creatorRingInner}>
          <Image source={{ uri: creator.avatar }} style={styles.creatorAvatar} />
        </View>
      </LinearGradient>
      <Text style={styles.creatorName} numberOfLines={1}>{creator.name}</Text>
      <Text style={styles.creatorHandle} numberOfLines={1}>{creator.handle}</Text>
      <Text style={styles.creatorPolls}>{creator.polls} polls</Text>
      <TouchableOpacity onPress={handleFollow} activeOpacity={0.8} disabled={isUpdating} style={[styles.followButton, following && styles.followingButton]}>
        <Text style={[styles.followText, following && styles.followingText]}>{isUpdating ? '...' : (following ? 'Following' : 'Follow')}</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const [activeCategory, setActiveCategory] = useState('dating');
  const [searchText, setSearchText] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [trending, setTrending] = useState<Poll[]>([]);
  const [creators, setCreators] = useState<CreatorSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadExplore = useCallback(async () => {
    try {
      setError(null);
      const feed = await pollpopApi.getFeed({
        category: activeCategory === 'hot-takes' ? 'hot-take' : activeCategory,
        search: searchText,
        limit: 10,
      });
      setTrending(feed.polls);
      setCreators(feed.creators);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load explore data.');
    }
  }, [activeCategory, searchText]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadExplore();
    }, 0);
    return () => clearTimeout(timeout);
  }, [loadExplore]);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 14) }]}>
        <Text style={styles.title}>Explore</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 88, 108) }]}
      >
        <View style={[styles.searchWrap, searchFocused && styles.searchWrapFocused]}>
          <Search size={16} color={searchFocused ? UI.color.purple : UI.color.subtle} strokeWidth={2.5} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search polls, creators, topics"
            placeholderTextColor="#BDBDBD"
            value={searchText}
            onChangeText={setSearchText}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
        </View>

        <View style={styles.chipsGrid}>
          {CATEGORIES.map((cat) => (
            <CategoryChip key={cat.id} cat={cat} active={activeCategory === cat.id} onPress={() => setActiveCategory(cat.id)} />
          ))}
        </View>

        <View style={styles.section}>
          <SectionHeader title="Trending now" action="See all" />
          <View style={styles.groupCard}>
            {error && <Text style={styles.stateText}>{error}</Text>}
            {!error && trending.length === 0 && <Text style={styles.stateText}>No matching polls yet.</Text>}
            {trending.map((item, index) => (
              <TrendingCard key={item.id} item={item} isLast={index === trending.length - 1} />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Creators to watch" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.creatorsRow}>
            {creators.map((creator) => <CreatorCard key={creator.id} creator={creator} />)}
          </ScrollView>
        </View>

        <TouchableOpacity activeOpacity={0.88} style={styles.bannerWrap}>
          <LinearGradient colors={UI.gradient.darkCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.banner}>
            <View style={styles.bannerIcon}>
              <Sparkles size={22} color={UI.color.purpleSoft} />
            </View>
            <View style={styles.bannerCopy}>
              <Text style={styles.bannerEyebrow}>New this week</Text>
              <Text style={styles.bannerTitle}>What is your vibe check?</Text>
            </View>
            <ChevronRight size={20} color={UI.color.white} />
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      <BottomNav activeTab="explore" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: UI.color.white },
  header: {
    paddingHorizontal: UI.space.xl,
    paddingBottom: UI.space.md,
    backgroundColor: UI.color.white,
  },
  title: {
    fontSize: UI.text.hero,
    fontWeight: '900',
    color: UI.color.black,
    letterSpacing: 0,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 6,
  },
  searchWrap: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: UI.color.surfaceMuted,
    borderRadius: UI.radius.md,
    borderWidth: 1,
    borderColor: '#EBEBEF',
    paddingHorizontal: UI.space.md,
    gap: 9,
    marginBottom: UI.space.lg,
  },
  searchWrapFocused: {
    borderColor: '#C4B5FD',
    backgroundColor: '#FDFAFF',
  },
  searchInput: {
    flex: 1,
    fontSize: UI.text.body,
    color: UI.color.black,
    fontWeight: '400',
    paddingVertical: 0,
  },
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: UI.space.sm,
    marginBottom: UI.space.xxl,
  },
  chip: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: UI.radius.pill,
    borderWidth: 1,
    gap: 5,
  },
  chipLabel: {
    fontSize: UI.text.caption,
    fontWeight: '700',
  },
  section: { marginBottom: UI.space.xxl },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: UI.space.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: UI.color.black,
    letterSpacing: 0,
  },
  sectionAction: {
    fontSize: 13,
    fontWeight: '700',
    color: UI.color.purple,
  },
  groupCard: {
    backgroundColor: UI.color.surface,
    borderRadius: UI.radius.lg,
    borderWidth: 1,
    borderColor: '#F0EEF6',
    paddingHorizontal: 14,
    ...UI.shadow.card,
  },
  stateText: {
    paddingVertical: UI.space.lg,
    color: UI.color.subtle,
    fontSize: UI.text.body,
    fontWeight: '600',
  },
  trendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: UI.space.md,
    gap: UI.space.md,
  },
  trendingBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  trendingBody: { flex: 1 },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
    gap: 5,
  },
  smallAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: UI.color.line,
  },
  authorText: {
    fontSize: 12,
    fontWeight: '700',
    color: UI.color.ink,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
  },
  timeText: {
    fontSize: 12,
    color: UI.color.subtle,
    fontWeight: '500',
  },
  questionText: {
    fontSize: UI.text.bodyLarge,
    fontWeight: '800',
    color: UI.color.black,
    lineHeight: 21,
    marginBottom: 6,
    letterSpacing: 0,
  },
  voteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  votesText: {
    fontSize: 12,
    color: UI.color.purple,
    fontWeight: '600',
  },
  trendingTile: {
    width: 54,
    height: 54,
    borderRadius: UI.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  creatorsRow: {
    paddingRight: UI.space.sm,
    gap: UI.space.md,
  },
  creatorCard: {
    width: 104,
    alignItems: 'center',
    backgroundColor: UI.color.surface,
    borderRadius: UI.radius.lg,
    borderWidth: 1,
    borderColor: '#F0EEF6',
    paddingVertical: 14,
    paddingHorizontal: UI.space.sm,
    ...UI.shadow.card,
  },
  creatorRing: {
    borderRadius: UI.radius.pill,
    padding: 2,
    marginBottom: UI.space.sm,
  },
  creatorRingInner: {
    backgroundColor: UI.color.surface,
    borderRadius: UI.radius.pill,
    padding: 2,
  },
  creatorAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: UI.color.line,
  },
  creatorName: {
    fontSize: 13,
    fontWeight: '800',
    color: UI.color.black,
    textAlign: 'center',
  },
  creatorHandle: {
    fontSize: 11,
    color: UI.color.subtle,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 2,
  },
  creatorPolls: {
    fontSize: 11,
    color: '#C4B5FD',
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 10,
  },
  followButton: {
    width: '100%',
    borderRadius: UI.radius.pill,
    backgroundColor: UI.color.purple,
    paddingVertical: 6,
    alignItems: 'center',
  },
  followingButton: {
    backgroundColor: UI.color.purpleSoft,
    borderWidth: 1,
    borderColor: UI.color.purpleLine,
  },
  followText: {
    fontSize: 12,
    fontWeight: '700',
    color: UI.color.white,
  },
  followingText: {
    color: UI.color.purpleDeep,
  },
  bannerWrap: {
    borderRadius: UI.radius.lg,
    overflow: 'hidden',
    marginBottom: UI.space.sm,
    shadowColor: UI.color.purpleDeep,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 6,
  },
  banner: {
    minHeight: 84,
    borderRadius: UI.radius.lg,
    paddingHorizontal: UI.space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: UI.space.md,
  },
  bannerIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(168,85,247,0.2)',
  },
  bannerCopy: { flex: 1 },
  bannerEyebrow: {
    fontSize: UI.text.caption,
    fontWeight: '700',
    color: 'rgba(221,214,254,0.8)',
    marginBottom: 3,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: UI.color.white,
    lineHeight: 23,
    letterSpacing: 0,
  },
});
