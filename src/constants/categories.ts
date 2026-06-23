export const POLL_CATEGORIES = [
  { id: 'dating', label: 'Dating', emoji: '💜' },
  { id: 'hot-takes', label: 'Hot Takes', emoji: '🔥' },
  { id: 'friendship', label: 'Friendship', emoji: '🤝' },
  { id: 'money', label: 'Money', emoji: '💰' },
  { id: 'random', label: 'Random', emoji: '😎' },
  { id: 'spicy', label: 'Spicy', emoji: '🌶️' },
] as const;

export type PollCategoryId = (typeof POLL_CATEGORIES)[number]['id'];

export const CATEGORY_EMOJI: Record<string, string> = {
  ...Object.fromEntries(POLL_CATEGORIES.map((category) => [category.id, category.emoji])),
  'hot-take': '🔥',
};

/** Map legacy DB slugs to current ids for display/filtering. */
export const normalizeCategoryId = (id: string): string => {
  if (id === 'hot-take') return 'hot-takes';
  return id;
};
