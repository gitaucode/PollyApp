/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

const palette = {
  white: '#FFFFFF',
  black: '#111827',
  ink: '#1F2937',
  muted: '#6B7280',
  subtle: '#9CA3AF',
  line: '#E5E7EB',
  surface: '#FAFAFA',
  surfaceMuted: '#F5F5F7',
  purple: '#A855F7',
  purpleDark: '#7C3AED',
  purpleDeep: '#6D28D9',
  purpleSoft: '#F3E8FF',
  purpleLine: '#DDD6FE',
  danger: '#EF4444',
} as const;

export const Colors = {
  light: {
    text: palette.black,
    background: palette.white,
    backgroundElement: palette.surfaceMuted,
    backgroundSelected: palette.purpleSoft,
    textSecondary: palette.muted,
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const UI = {
  color: palette,
  gradient: {
    brand: [palette.purple, palette.purpleDark] as [string, string],
    darkCard: ['#0F0A1F', '#241044', '#130A28'] as [string, string, string],
    avatar: ['#8B5CF6', '#D946EF', '#F43F5E'] as [string, string, string],
  },
  radius: {
    sm: 10,
    md: 14,
    lg: 18,
    xl: 22,
    pill: 999,
  },
  space: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
  },
  text: {
    nav: 11,
    caption: 12,
    body: 14,
    bodyLarge: 15,
    title: 20,
    hero: 24,
  },
  shadow: {
    card: {
      shadowColor: palette.purpleDeep,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 3,
    },
    nav: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 10,
    },
  },
} as const;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
