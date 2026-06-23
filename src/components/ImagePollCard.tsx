import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ImageSourcePropType,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MoreHorizontal, ShieldCheck, MessageCircle, Share2, Sparkles } from 'lucide-react-native';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ImagePollOptionData {
  id: string;
  label: string;
  image: ImageSourcePropType | string;
}

export interface ImagePollData {
  id: string;
  creator: {
    name: string;
    avatar: string;
    badge?: string;   // emoji badge, e.g. '🔥'
    isCreator?: boolean;
  };
  question: string;
  timeAgo: string;
  options: [ImagePollOptionData, ImagePollOptionData]; // always exactly 2
  votes: number;
  comments: number;
  shares: number;
}

interface ImagePollCardProps {
  poll: ImagePollData;
  onVote?: (pollId: string, optionId: string) => Promise<void> | void;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ImagePollCard({ poll, onVote }: ImagePollCardProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [isVoting, setIsVoting] = useState(false);

  const handleVote = async () => {
    if (!selected || !onVote || isVoting) return;
    setIsVoting(true);
    try {
      await onVote(poll.id, selected);
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.card}>
        {/* ── Creator row ── */}
        <View style={styles.creatorRow}>
          <View style={styles.creatorLeft}>
            <Image source={{ uri: poll.creator.avatar }} style={styles.creatorAvatar} />
            <Text style={styles.creatorName}>{poll.creator.name}</Text>
            {poll.creator.badge && (
              <Text style={styles.creatorBadge}>{poll.creator.badge}</Text>
            )}
            <View style={styles.dot} />
            <Text style={styles.timeAgo}>{poll.timeAgo}</Text>
          </View>
          <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MoreHorizontal color="#9CA3AF" size={20} />
          </TouchableOpacity>
        </View>

        {/* ── Question ── */}
        <Text style={styles.question}>{poll.question}</Text>

        {/* ── Anonymous badge ── */}
        <View style={styles.anonBadge}>
          <ShieldCheck size={13} color="#A855F7" />
          <Text style={styles.anonText}>Anonymous vote</Text>
        </View>

        {/* ── Image options grid ── */}
        <View style={styles.optionsGrid}>
          {poll.options.map((option) => {
            const isSelected = selected === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                onPress={() => setSelected(option.id)}
                activeOpacity={0.85}
              >
                {/* Image */}
                <Image
                  source={typeof option.image === 'string' ? { uri: option.image } : option.image}
                  style={styles.optionImage}
                  resizeMode="cover"
                />

                {/* Selected checkmark overlay */}
                {isSelected && (
                  <View style={styles.checkOverlay}>
                    <View style={styles.checkCircle}>
                      <Text style={styles.checkMark}>✓</Text>
                    </View>
                  </View>
                )}

                {/* Label row */}
                <View style={styles.optionLabel}>
                  {/* Radio circle */}
                  <View style={[styles.radio, isSelected && styles.radioSelected]}>
                    {isSelected && <View style={styles.radioDot} />}
                  </View>
                  <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                    {option.label}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Vote button ── */}
        <TouchableOpacity
          style={styles.voteButtonWrapper}
          activeOpacity={0.9}
          disabled={!selected || isVoting}
          onPress={handleVote}
        >
          <LinearGradient
            colors={selected ? ['#9333EA', '#7C3AED'] : ['#C4B5FD', '#A78BFA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.voteButton}
          >
            <Sparkles size={15} color="white" style={{ marginRight: 6 }} />
            <Text style={styles.voteButtonText}>{isVoting ? 'Voting...' : 'Vote anonymously'}</Text>
            <Sparkles size={15} color="white" style={{ marginLeft: 6 }} />
          </LinearGradient>
        </TouchableOpacity>

        {/* ── Engagement row ── */}
        <View style={styles.engagementRow}>
          <View style={styles.engagementLeft}>
            <View style={styles.stackedAvatars}>
              {[1, 2, 3].map((i) => (
                <Image
                  key={i}
                  source={{ uri: `https://i.pravatar.cc/150?u=voter${i}b` }}
                  style={[styles.stackedAvatar, { marginLeft: i === 1 ? 0 : -7 }]}
                />
              ))}
            </View>
            <Text style={styles.voteCountBold}>{poll.votes} </Text>
            <Text style={styles.voteCountLight}>votes</Text>
          </View>

          <View style={styles.engagementRight}>
            <TouchableOpacity style={styles.engagementItem}>
              <MessageCircle color="#9CA3AF" size={17} />
              <Text style={styles.engagementCount}>{poll.comments}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.engagementItem}>
              <Share2 color="#9CA3AF" size={17} />
              <Text style={styles.engagementCount}>{poll.shares}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },

  // Creator row
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  creatorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  creatorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
    backgroundColor: '#E5E7EB',
  },
  creatorName: {
    fontWeight: '700',
    fontSize: 14,
    color: '#111827',
  },
  creatorBadge: {
    fontSize: 14,
    marginLeft: 4,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    marginHorizontal: 7,
  },
  timeAgo: {
    fontSize: 13,
    color: '#9CA3AF',
  },

  // Question
  question: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    lineHeight: 27,
    marginBottom: 10,
    letterSpacing: -0.3,
  },

  // Anonymous badge
  anonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 14,
  },
  anonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A855F7',
  },

  // Options grid — side by side
  optionsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  optionCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2.5,
    borderColor: 'transparent',
    backgroundColor: '#F9FAFB',
  },
  optionCardSelected: {
    borderColor: '#A855F7',
  },
  optionImage: {
    width: '100%',
    height: 130,
    backgroundColor: '#E5E7EB',
  },

  // Check overlay (top-left when selected)
  checkOverlay: {
    position: 'absolute',
    top: 8,
    left: 8,
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#A855F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    color: 'white',
    fontSize: 13,
    fontWeight: '800',
  },

  // Label below image
  optionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 8,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
  },
  radioSelected: {
    borderColor: '#A855F7',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#A855F7',
  },
  optionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  optionTextSelected: {
    color: '#7C3AED',
  },

  // Vote button
  voteButtonWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 14,
  },
  voteButton: {
    paddingVertical: 15,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voteButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // Engagement
  engagementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  engagementLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stackedAvatars: {
    flexDirection: 'row',
    marginRight: 8,
  },
  stackedAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: 'white',
    backgroundColor: '#E5E7EB',
  },
  voteCountBold: {
    color: '#7C3AED',
    fontWeight: '700',
    fontSize: 13,
  },
  voteCountLight: {
    color: '#6B7280',
    fontSize: 13,
  },
  engagementRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  engagementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  engagementCount: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '500',
  },
});
