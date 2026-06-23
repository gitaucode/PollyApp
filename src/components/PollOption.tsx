import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { UI } from '@/constants/theme';

interface PollOptionProps {
  text: string;
  emoji: string;
  isSelected: boolean;
  onPress: () => void;
}

export default function PollOption({ text, emoji, isSelected, onPress }: PollOptionProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={[styles.option, isSelected && styles.optionSelected]}
    >
      <View style={styles.left}>
        <View style={[styles.radio, isSelected && styles.radioSelected]}>
          {isSelected && <View style={styles.radioDot} />}
        </View>
        <Text style={[styles.label, isSelected && styles.labelSelected]} numberOfLines={1}>
          {text}
        </Text>
      </View>
      <Text style={styles.emoji}>{emoji}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  option: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.97)',
    paddingVertical: 10,
    paddingHorizontal: UI.space.md,
    borderRadius: UI.radius.md,
    marginBottom: UI.space.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  optionSelected: {
    backgroundColor: 'rgba(243, 232, 255, 0.9)',
    borderColor: UI.color.purple,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: UI.space.sm,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radioSelected: {
    borderColor: UI.color.purple,
  },
  radioDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: UI.color.purple,
  },
  label: {
    fontSize: UI.text.body,
    fontWeight: '600',
    color: UI.color.black,
    flexShrink: 1,
  },
  labelSelected: {
    color: UI.color.purpleDeep,
    fontWeight: '700',
  },
  emoji: {
    fontSize: 17,
    flexShrink: 0,
  },
});
