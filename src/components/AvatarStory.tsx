import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BadgeCheck, Plus } from 'lucide-react-native';
import { User } from '@/types/pollpop';
import { UI } from '@/constants/theme';

interface AvatarStoryProps {
  user?: User;
  isAdd?: boolean;
  onPress?: () => void;
}

const AVATAR_SIZE = 52;

export default function AvatarStory({ user, isAdd, onPress }: AvatarStoryProps) {
  const avatarUri = isAdd ? 'https://i.pravatar.cc/150?u=currentuser' : user?.avatar;
  const content = (
    <>
      <View style={styles.ringWrapper}>
        <LinearGradient
          colors={UI.gradient.avatar}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <View style={styles.innerBorder}>
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          </View>
        </LinearGradient>

        {isAdd && (
          <View style={styles.plusBadge}>
            <Plus size={9} color={UI.color.white} strokeWidth={3.5} />
          </View>
        )}
      </View>

      <View style={styles.nameRow}>
        <Text style={styles.nameText} numberOfLines={1}>
          {isAdd ? 'Add yours' : user?.name}
        </Text>
        {!isAdd && user?.isCreator && (
          <BadgeCheck size={10} color={UI.color.purple} fill={UI.color.purpleSoft} />
        )}
      </View>
    </>
  );

  if (onPress && !isAdd) {
    return (
      <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={styles.container}>{content}</View>;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginRight: UI.space.md,
    width: 62,
  },
  ringWrapper: {
    position: 'relative',
  },
  gradient: {
    borderRadius: UI.radius.pill,
    padding: 2,
  },
  innerBorder: {
    backgroundColor: UI.color.white,
    borderRadius: UI.radius.pill,
    padding: 2,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: UI.color.line,
  },
  plusBadge: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    backgroundColor: UI.color.purple,
    borderRadius: UI.radius.pill,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: UI.color.white,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    maxWidth: 62,
    gap: 2,
  },
  nameText: {
    fontSize: UI.text.nav,
    fontWeight: '500',
    color: UI.color.ink,
    textAlign: 'center',
  },
});
