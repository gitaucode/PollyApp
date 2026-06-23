import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Search, Plus, Bell, User } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { UI } from '@/constants/theme';

type NavItemId = 'home' | 'explore' | 'create' | 'activity' | 'profile';

type NavItem = {
  id: NavItemId;
  label: string;
  icon: React.ElementType;
  badge?: boolean;
  isCenter?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'explore', label: 'Explore', icon: Search },
  { id: 'create', label: '', icon: Plus, isCenter: true },
  { id: 'activity', label: 'Activity', icon: Bell, badge: true },
  { id: 'profile', label: 'Profile', icon: User },
];

interface BottomNavProps {
  activeTab?: NavItemId;
}

export default function BottomNav({ activeTab }: BottomNavProps) {
  const [localActive, setLocalActive] = React.useState<NavItemId>('home');
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const active = activeTab ?? localActive;

  const handlePress = (id: NavItemId) => {
    if (!activeTab) setLocalActive(id);
    if (id === 'explore') router.push('/explore');
    else if (id === 'home') router.push('/');
    else if (id === 'profile') router.push('/profile');
    else if (id === 'activity') router.push('/activity');
    else if (id === 'create') router.push('/create');
  };

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.id;

        if (item.isCenter) {
          return (
            <View key={item.id} style={styles.centerWrapper}>
              <TouchableOpacity
                onPress={() => router.push('/create')}
                style={styles.centerButton}
                activeOpacity={0.85}
              >
                <Icon size={28} color="white" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          );
        }

        return (
          <TouchableOpacity
            key={item.id}
            onPress={() => handlePress(item.id)}
            style={styles.navItem}
            activeOpacity={0.7}
          >
            <View style={styles.iconWrapper}>
              <Icon
                size={24}
                color={isActive ? UI.color.purple : UI.color.subtle}
                fill={isActive && item.id === 'home' ? UI.color.purple : 'transparent'}
                strokeWidth={isActive ? 2.5 : 2}
              />
              {item.badge && (
                <View style={styles.badge} />
              )}
            </View>
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: UI.color.white,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
    ...UI.shadow.nav,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: -2,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: UI.color.danger,
    borderWidth: 1.5,
    borderColor: UI.color.white,
  },
  label: {
    fontSize: UI.text.nav,
    fontWeight: '500',
    color: UI.color.subtle,
    marginTop: 4,
  },
  labelActive: {
    color: UI.color.purple,
    fontWeight: '600',
  },
  centerWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  centerButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: UI.color.purple,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: UI.color.purple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
});
