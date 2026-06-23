import React, { useState } from 'react';
import { Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Flame } from 'lucide-react-native';
import { UI } from '@/constants/theme';

const TABS = [
  { id: 'foryou', label: 'For you', icon: null },
  { id: 'following', label: 'Following', icon: null },
  { id: 'trending', label: 'Trending', icon: 'flame' },
];

interface CategoryTabsProps {
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
}

export default function CategoryTabs({ activeTab: controlledTab, onTabChange }: CategoryTabsProps) {
  const [internalTab, setInternalTab] = useState('foryou');
  const activeTab = controlledTab ?? internalTab;
  const setActiveTab = onTabChange ?? setInternalTab;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.content}
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            onPress={() => setActiveTab(tab.id)}
            style={[styles.tab, isActive ? styles.tabActive : styles.tabInactive]}
            activeOpacity={0.8}
          >
            {tab.icon === 'flame' && (
              <Flame
                size={13}
                color="#F59E0B"
                fill="#F59E0B"
                style={{ marginRight: 4 }}
              />
            )}
            <Text style={[styles.tabLabel, isActive ? styles.tabLabelActive : styles.tabLabelInactive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
    marginTop: UI.space.md,
    marginBottom: UI.space.md,
  },
  content: {
    paddingHorizontal: UI.space.lg,
    gap: UI.space.sm,
    alignItems: 'center',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: UI.space.lg,
    paddingVertical: 7,
    borderRadius: UI.radius.pill,
  },
  tabActive: {
    backgroundColor: UI.color.black,
  },
  tabInactive: {
    backgroundColor: 'transparent',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: UI.color.white,
  },
  tabLabelInactive: {
    color: UI.color.muted,
  },
});
