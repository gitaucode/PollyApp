import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Lock, Upload } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { pollpopApi } from '@/lib/api';
import { UI } from '@/constants/theme';
import { Poll } from '@/types/pollpop';

interface ResultOption {
  id: string;
  label: string;
  percentage: number;
  votes: number;
  barColors: [string, string];
}

const COMMENT_AVATARS = [
  'https://i.pravatar.cc/150?img=12',
  'https://i.pravatar.cc/150?img=25',
  'https://i.pravatar.cc/150?img=33',
];

const BAR_COLORS: [string, string][] = [
  ['#9B59F4', '#7C3AED'],
  ['#FF6B9D', '#E91E8C'],
  ['#FFD93D', '#FFC107'],
  ['#26D0CE', '#1A9EA0'],
  ['#60A5FA', '#2563EB'],
  ['#34D399', '#059669'],
];

function ResultBar({ option, delay }: { option: ResultOption; delay: number }) {
  const anim = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    Animated.timing(anim, {
      toValue: option.percentage / 100,
      duration: 700,
      delay,
      useNativeDriver: false,
    }).start();
  }, [anim, delay, option.percentage]);

  const barWidth = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', `${option.percentage}%`],
  });

  return (
    <View style={bar.container}>
      <View style={bar.labelRow}>
        <Text style={bar.label}>{option.label}</Text>
        <Text style={bar.pct}>{option.percentage}%</Text>
      </View>
      <View style={bar.track}>
        <Animated.View style={[bar.fill, { width: barWidth }]}>
          <LinearGradient
            colors={option.barColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>
      <Text style={bar.votes}>{option.votes} votes</Text>
    </View>
  );
}

export default function ResultsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { pollId } = useLocalSearchParams<{ pollId?: string }>();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadResults = useCallback(async () => {
    try {
      setError(null);
      if (pollId) {
        // Load a specific poll by ID (navigated from PollCard)
        setPoll(await pollpopApi.getPoll(pollId));
      } else {
        // Fallback: show the most recent poll
        const feed = await pollpopApi.getFeed({ limit: 1 });
        if (feed.polls[0]) {
          setPoll(await pollpopApi.getPoll(feed.polls[0].id));
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load results.');
    } finally {
      setLoading(false);
    }
  }, [pollId]);

  useEffect(() => {
    const timeout = setTimeout(() => { void loadResults(); }, 0);
    return () => clearTimeout(timeout);
  }, [loadResults]);

  const resultOptions = useMemo<ResultOption[]>(() => {
    if (!poll) return [];
    return poll.options.map((option, index) => ({
      id: option.id,
      label: option.text,
      percentage: option.percentage ?? 0,
      votes: option.votes ?? 0,
      barColors: BAR_COLORS[index % BAR_COLORS.length],
    }));
  }, [poll]);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 14) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} activeOpacity={0.7}>
          <ChevronLeft size={24} color={UI.color.black} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Results</Text>
        <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
          <Upload size={20} color={UI.color.black} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={UI.color.purple} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorTextFull}>{error}</Text>
        </View>
      ) : !poll ? (
        <View style={styles.centered}>
          <Text style={styles.errorTextFull}>No poll found.</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom + 80, 100) },
          ]}
        >
          <LinearGradient
            colors={['#EDE9FF', '#F5F0FF', '#FDF8FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.questionCard}
          >
            <Text style={styles.decorTop}>Pop</Text>
            <Text style={styles.authorLine}>
              {poll.creator.name}  —  {poll.timeAgo}
            </Text>
            <Text style={styles.questionText}>{poll.question}</Text>
            <View style={styles.anonBadge}>
              <Lock size={12} color="#7C3AED" strokeWidth={2.5} />
              <Text style={styles.anonBadgeText}>Anonymous vote</Text>
            </View>
          </LinearGradient>

          <View style={styles.voteFooter}>
            <Text style={styles.totalVotes}>
              <Text style={styles.totalVotesBold}>{poll.votes}</Text> votes
            </Text>
            <View style={styles.privateRow}>
              <Lock size={11} color={UI.color.subtle} strokeWidth={2.5} />
              <Text style={styles.privateText}>Your vote is private</Text>
            </View>
          </View>

          <View style={styles.barsSection}>
            {resultOptions.map((opt, i) => (
              <ResultBar key={opt.id} option={opt} delay={i * 120} />
            ))}
          </View>

          <TouchableOpacity style={styles.commentsRow} activeOpacity={0.75}>
            <View style={styles.commentsLeft}>
              <View style={styles.avatarStack}>
                {COMMENT_AVATARS.map((uri, i) => (
                  <Image
                    key={uri}
                    source={{ uri }}
                    style={[styles.commentAvatar, { marginLeft: i === 0 ? 0 : -10, zIndex: 3 - i }]}
                  />
                ))}
              </View>
              <View>
                <Text style={styles.commentsTitle}>People are talking</Text>
                <Text style={styles.commentsSub}>{poll.comments} comments</Text>
              </View>
            </View>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const bar = StyleSheet.create({
  container: { marginBottom: 16 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 },
  label: { fontSize: 14, fontWeight: '700', color: '#111827', flex: 1, marginRight: 8 },
  pct: { fontSize: 15, fontWeight: '800', color: '#111827' },
  track: { height: 10, borderRadius: 999, backgroundColor: '#F3F4F6', overflow: 'hidden', marginBottom: 5 },
  fill: { height: '100%', borderRadius: 999, overflow: 'hidden' },
  votes: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorTextFull: { color: '#DC2626', fontSize: 14, fontWeight: '600', textAlign: 'center', paddingHorizontal: 32 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 18, paddingTop: 12 },
  questionCard: {
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 22,
    marginBottom: 14,
    overflow: 'hidden',
  },
  decorTop: { alignSelf: 'flex-start', color: '#7C3AED', fontSize: 40, fontWeight: '900', marginBottom: 18 },
  authorLine: { fontSize: 13, fontWeight: '600', color: '#6B7280', marginBottom: 10 },
  questionText: { fontSize: 22, fontWeight: '800', color: '#111827', lineHeight: 30, marginBottom: 18 },
  anonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    gap: 6,
  },
  anonBadgeText: { fontSize: 12, fontWeight: '700', color: '#7C3AED' },
  voteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  totalVotes: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  totalVotesBold: { fontSize: 15, fontWeight: '800', color: '#7C3AED' },
  privateRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  privateText: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },
  barsSection: { marginBottom: 8 },
  commentsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  commentsLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarStack: { flexDirection: 'row', alignItems: 'center' },
  commentAvatar: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 2, borderColor: '#FFFFFF', backgroundColor: '#F3F4F6',
  },
  commentsTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  commentsSub: { fontSize: 12, color: '#6B7280', marginTop: 1 },
});
