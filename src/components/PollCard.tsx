import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MoreHorizontal, MessageCircle, Share2, ShieldCheck, BadgeCheck, BarChart2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Poll } from '@/types/pollpop';
import PollOption from './PollOption';
import { UI } from '@/constants/theme';

interface PollCardProps {
  poll: Poll;
  onVote?: (pollId: string, optionId: string) => Promise<void> | void;
}

export default function PollCard({ poll, onVote }: PollCardProps) {
  const router = useRouter();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isVoting, setIsVoting] = useState(false);

  const handleVote = async () => {
    if (!selectedOption || !onVote || isVoting) return;
    setIsVoting(true);
    try {
      await onVote(poll.id, selectedOption);
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <LinearGradient
        colors={UI.gradient.darkCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.creatorRow}>
          <View style={styles.creatorLeft}>
            <Image source={{ uri: poll.creator.avatar }} style={styles.creatorAvatar} />
            <Text style={styles.creatorName}>{poll.creator.name}</Text>
            {poll.creator.isCreator && (
              <BadgeCheck size={12} color={UI.color.purpleSoft} fill="rgba(168,85,247,0.35)" />
            )}
            <View style={styles.dot} />
            <Text style={styles.timeAgo}>{poll.timeAgo}</Text>
          </View>
          <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MoreHorizontal color="rgba(255,255,255,0.58)" size={20} />
          </TouchableOpacity>
        </View>

        <Text style={styles.question}>{poll.question}</Text>

        <View style={styles.badge}>
          <ShieldCheck size={12} color={UI.color.purpleSoft} />
          <Text style={styles.badgeText}>Anonymous vote</Text>
        </View>

        <View style={styles.optionsContainer}>
          {poll.options.map((option) => (
            <PollOption
              key={option.id}
              text={option.text}
              emoji={option.emoji || ''}
              isSelected={selectedOption === option.id}
              onPress={() => setSelectedOption(option.id)}
            />
          ))}
        </View>

        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.voteButtonWrapper}
          onPress={handleVote}
          disabled={!selectedOption || isVoting}
        >
          <LinearGradient
            colors={UI.gradient.brand}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.voteButton}
          >
            <Text style={styles.voteButtonText}>{isVoting ? 'Voting...' : 'Vote anonymously'}</Text>
            <ShieldCheck size={16} color={UI.color.white} />
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.engagementRow}>
        <TouchableOpacity
          style={styles.engagementLeft}
          onPress={() => router.push({ pathname: '/results', params: { pollId: poll.id } })}
          activeOpacity={0.7}
        >
          <View style={styles.stackedAvatars}>
            {[1, 2, 3].map((i) => (
              <Image
                key={i}
                source={{ uri: `https://i.pravatar.cc/150?u=voter${i}` }}
                style={[styles.stackedAvatar, { marginLeft: i === 1 ? 0 : -7 }]}
              />
            ))}
          </View>
          <Text style={styles.voteCountBold}>{poll.votes} </Text>
          <Text style={styles.voteCountLight}>votes</Text>
          <BarChart2 size={13} color={UI.color.purple} strokeWidth={2.2} style={{ marginLeft: 6 }} />
        </TouchableOpacity>

        <View style={styles.engagementRight}>
          <TouchableOpacity style={styles.engagementItem}>
            <MessageCircle color={UI.color.subtle} size={17} />
            <Text style={styles.engagementCount}>{poll.comments}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.engagementItem}>
            <Share2 color={UI.color.subtle} size={17} />
            <Text style={styles.engagementCount}>{poll.shares}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: UI.space.lg,
    marginBottom: UI.space.lg,
  },
  card: {
    borderRadius: UI.radius.xl,
    padding: UI.space.lg,
    shadowColor: UI.color.purpleDeep,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.34,
    shadowRadius: 18,
    elevation: 12,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: UI.space.md,
  },
  creatorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  creatorAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#374151',
  },
  creatorName: {
    color: UI.color.white,
    fontWeight: '700',
    fontSize: 13,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.34)',
  },
  timeAgo: {
    color: 'rgba(255,255,255,0.48)',
    fontSize: UI.text.caption,
  },
  question: {
    color: UI.color.white,
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 29,
    marginBottom: UI.space.md,
    letterSpacing: 0,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(168, 85, 247, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(192, 132, 252, 0.28)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: UI.radius.pill,
    marginBottom: UI.space.md,
    gap: 5,
  },
  badgeText: {
    color: UI.color.purpleSoft,
    fontSize: UI.text.caption,
    fontWeight: '600',
  },
  optionsContainer: {
    marginBottom: UI.space.sm,
  },
  voteButtonWrapper: {
    borderRadius: UI.radius.md,
    overflow: 'hidden',
  },
  voteButton: {
    minHeight: 48,
    paddingVertical: 14,
    borderRadius: UI.radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  voteButtonText: {
    color: UI.color.white,
    fontSize: UI.text.bodyLarge,
    fontWeight: '700',
    letterSpacing: 0,
  },
  engagementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: UI.space.lg,
    paddingHorizontal: UI.space.xs,
  },
  engagementLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stackedAvatars: {
    flexDirection: 'row',
    marginRight: UI.space.sm,
  },
  stackedAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: UI.color.white,
    backgroundColor: UI.color.line,
  },
  voteCountBold: {
    color: UI.color.purpleDark,
    fontWeight: '700',
    fontSize: 13,
  },
  voteCountLight: {
    color: UI.color.muted,
    fontSize: 13,
  },
  engagementRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: UI.space.lg,
  },
  engagementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  engagementCount: {
    color: UI.color.muted,
    fontSize: 13,
    fontWeight: '500',
  },
});
