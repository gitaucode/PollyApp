import { UI } from '@/constants/theme';
import { pollpopApi } from '@/lib/api';
import { Poll, User } from '@/types/pollpop';
import { Bell } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AvatarStory from '../components/AvatarStory';
import BottomNav from '../components/BottomNav';
import CategoryTabs from '../components/CategoryTabs';
import ImagePollCard from '../components/ImagePollCard';
import PollCard from '../components/PollCard';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [stories, setStories] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('foryou');

  const loadFeed = useCallback(async () => {
    try {
      setError(null);
      const feed = await pollpopApi.getFeed({ limit: 20 });
      setPolls(feed.polls);
      setStories(feed.stories);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load polls.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadFeed();
    }, 0);
    return () => clearTimeout(timeout);
  }, [loadFeed]);

  const imagePolls = useMemo(
    () => polls.filter((poll) => poll.options.length === 2 && poll.options.every((option) => option.imageUrl)),
    [polls],
  );
  const textPolls = useMemo(
    () => polls.filter((poll) => !imagePolls.some((imagePoll) => imagePoll.id === poll.id)),
    [imagePolls, polls],
  );

  const handleVote = useCallback(async (pollId: string, optionId: string) => {
    const { poll } = await pollpopApi.vote(pollId, optionId);
    setPolls((current) => current.map((item) => (item.id === poll.id ? poll : item)));
  }, []);

  return (
    <View style={styles.root}>
      {/* Fixed Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 14) }]}>
        <Text style={styles.logoText}>PollPop</Text>
        <TouchableOpacity style={styles.bellButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Bell color={UI.color.ink} size={22} />
        </TouchableOpacity>
      </View>

      {/* Scrollable Feed */}
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        bounces
      >
        {/* Stories / Avatar Row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.storiesScroll}
          contentContainerStyle={styles.storiesContent}
        >
          <AvatarStory isAdd />
          {stories.map((user) => (
            <AvatarStory key={user.id} user={user} />
          ))}
        </ScrollView>

        {/* Category Filter Tabs */}
        <CategoryTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Poll Cards */}
        {loading && <Text style={styles.stateText}>Loading polls...</Text>}
        {error && <Text style={styles.stateText}>{error}</Text>}
        {!loading && !error && polls.length === 0 && (
          <Text style={styles.stateText}>No polls yet. Be the first to pop one.</Text>
        )}
        {imagePolls.map((poll) => (
          <ImagePollCard
            key={poll.id}
            onVote={handleVote}
            poll={{
              id: poll.id,
              creator: {
                name: poll.creator.name,
                avatar: poll.creator.avatar,
                badge: poll.creator.isCreator ? 'pop' : undefined,
                isCreator: poll.creator.isCreator,
              },
              question: poll.question,
              timeAgo: poll.timeAgo,
              options: [
                {
                  id: poll.options[0].id,
                  label: poll.options[0].text,
                  image: poll.options[0].imageUrl || '',
                },
                {
                  id: poll.options[1].id,
                  label: poll.options[1].text,
                  image: poll.options[1].imageUrl || '',
                },
              ],
              votes: poll.votes,
              comments: poll.comments,
              shares: poll.shares,
            }}
          />
        ))}
        {textPolls.map((poll) => (
          <PollCard key={poll.id} poll={poll} onVote={handleVote} />
        ))}
      </ScrollView>

      {/* Fixed Bottom Navigation */}
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: UI.color.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: UI.space.xl,
    paddingBottom: UI.space.md,
    backgroundColor: UI.color.white,
  },
  logoText: {
    fontSize: UI.text.hero,
    fontWeight: '900',
    color: UI.color.purple,
    letterSpacing: 0,
  },
  bellButton: {
    padding: 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  stateText: {
    paddingHorizontal: UI.space.xl,
    paddingVertical: UI.space.lg,
    color: UI.color.subtle,
    fontSize: UI.text.body,
    fontWeight: '600',
  },
  storiesScroll: {
    flexGrow: 0,
  },
  storiesContent: {
    paddingHorizontal: UI.space.lg,
    paddingVertical: 2,
  },
});
