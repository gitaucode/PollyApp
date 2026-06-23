import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Lock, Bookmark, Share2, Send } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { pollpopApi, PollComment } from '@/lib/api';
import { sharePoll } from '@/lib/share-poll';
import { UI } from '@/constants/theme';
import { Poll } from '@/types/pollpop';

interface ResultOption {
  id: string;
  label: string;
  percentage: number;
  votes: number;
  barColors: [string, string];
}

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

function CommentRow({ comment }: { comment: PollComment }) {
  return (
    <View style={styles.commentRow}>
      <Image source={{ uri: comment.author.avatar }} style={styles.commentAvatar} />
      <View style={styles.commentBody}>
        <View style={styles.commentMeta}>
          <Text style={styles.commentAuthor}>{comment.author.name}</Text>
          <Text style={styles.commentTime}>{comment.timeAgo}</Text>
        </View>
        <Text style={styles.commentText}>{comment.body}</Text>
      </View>
    </View>
  );
}

export default function ResultsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const { pollId } = useLocalSearchParams<{ pollId?: string }>();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [comments, setComments] = useState<PollComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [saveUpdating, setSaveUpdating] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  const loadResults = useCallback(async () => {
    try {
      setError(null);
      if (pollId) {
        const loaded = await pollpopApi.getPoll(pollId);
        setPoll(loaded);
        setIsSaved(Boolean(loaded.isSaved));
      } else {
        const feed = await pollpopApi.getFeed({ limit: 1 });
        if (feed.polls[0]) {
          const loaded = await pollpopApi.getPoll(feed.polls[0].id);
          setPoll(loaded);
          setIsSaved(Boolean(loaded.isSaved));
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load results.');
    } finally {
      setLoading(false);
    }
  }, [pollId]);

  const loadComments = useCallback(async (id: string) => {
    try {
      setCommentsLoading(true);
      setComments(await pollpopApi.getComments(id));
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : 'Could not load comments.');
    } finally {
      setCommentsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => { void loadResults(); }, 0);
    return () => clearTimeout(timeout);
  }, [loadResults]);

  useEffect(() => {
    if (poll?.id) void loadComments(poll.id);
  }, [poll?.id, loadComments]);

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

  const handleToggleSave = async () => {
    if (!poll || saveUpdating) return;
    setSaveUpdating(true);
    try {
      const saved = await pollpopApi.toggleSavePoll(poll.id, !isSaved);
      setIsSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update saved poll.');
    } finally {
      setSaveUpdating(false);
    }
  };

  const handleShare = () => {
    if (!poll) return;
    void sharePoll({ id: poll.id, question: poll.question });
  };

  const handlePostComment = async () => {
    const text = commentText.trim();
    if (!poll || !text || postingComment) return;
    setPostingComment(true);
    setCommentError(null);
    try {
      const comment = await pollpopApi.addComment(poll.id, text);
      setComments((current) => [...current, comment]);
      setPoll((current) => current ? { ...current, comments: current.comments + 1 } : current);
      setCommentText('');
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : 'Could not post comment.');
    } finally {
      setPostingComment(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
    >
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 14) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} activeOpacity={0.7}>
          <ChevronLeft size={24} color={UI.color.black} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Results</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconBtn}
            activeOpacity={0.7}
            onPress={handleToggleSave}
            disabled={saveUpdating || !poll}
          >
            <Bookmark
              size={20}
              color={UI.color.purple}
              fill={isSaved ? UI.color.purple : 'transparent'}
              strokeWidth={2}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7} onPress={handleShare} disabled={!poll}>
            <Share2 size={20} color={UI.color.black} strokeWidth={2} />
          </TouchableOpacity>
        </View>
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
        <>
          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: 16 },
            ]}
            keyboardShouldPersistTaps="handled"
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

            <View style={styles.commentsSection}>
              <Text style={styles.commentsHeading}>
                Comments {poll.comments > 0 ? `(${poll.comments})` : ''}
              </Text>
              {commentsLoading && comments.length === 0 ? (
                <ActivityIndicator color={UI.color.purple} style={{ marginVertical: 16 }} />
              ) : comments.length === 0 ? (
                <Text style={styles.commentsEmpty}>Be the first to share your take.</Text>
              ) : (
                <View style={styles.commentsList}>
                  {comments.map((comment) => (
                    <CommentRow key={comment.id} comment={comment} />
                  ))}
                </View>
              )}
              {commentError && <Text style={styles.commentError}>{commentError}</Text>}
            </View>
          </ScrollView>

          <View style={[styles.composeBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <TextInput
              style={styles.composeInput}
              placeholder="Add a comment..."
              placeholderTextColor="#9CA3AF"
              value={commentText}
              onChangeText={setCommentText}
              maxLength={500}
              multiline
              editable={!postingComment}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!commentText.trim() || postingComment) && styles.sendBtnDisabled]}
              onPress={handlePostComment}
              disabled={!commentText.trim() || postingComment}
              activeOpacity={0.85}
            >
              {postingComment ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Send size={18} color="#fff" strokeWidth={2.2} />
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
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
  headerActions: { flexDirection: 'row', alignItems: 'center' },
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
  commentsSection: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  commentsHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
  },
  commentsEmpty: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
    marginBottom: 8,
  },
  commentsList: { gap: 14 },
  commentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
  },
  commentBody: { flex: 1 },
  commentMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  commentAuthor: { fontSize: 13, fontWeight: '700', color: '#111827' },
  commentTime: { fontSize: 11, color: '#9CA3AF', fontWeight: '500' },
  commentText: { fontSize: 14, color: '#374151', lineHeight: 20 },
  commentError: { color: '#DC2626', fontSize: 12, fontWeight: '600', marginTop: 8 },
  composeBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  composeInput: {
    flex: 1,
    minHeight: 42,
    maxHeight: 100,
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: UI.color.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.45 },
});
