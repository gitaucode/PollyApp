export interface User {
  id: string;
  name: string;
  avatar: string;
  hasStory: boolean;
  isCreator?: boolean;
}

export interface PollOption {
  id: string;
  text: string;
  emoji: string;
}

export interface Poll {
  id: string;
  creator: User;
  question: string;
  timeAgo: string;
  options: PollOption[];
  votes: number;
  comments: number;
  shares: number;
}

export const CURRENT_USER: User = {
  id: 'u0',
  name: 'Me',
  avatar: 'https://i.pravatar.cc/150?u=u0',
  hasStory: false,
};

export const STORY_USERS: User[] = [
  { id: 'u1', name: 'Maya', avatar: 'https://i.pravatar.cc/150?u=maya', hasStory: true, isCreator: true },
  { id: 'u2', name: 'Tyler', avatar: 'https://i.pravatar.cc/150?u=tyler', hasStory: true },
  { id: 'u3', name: 'Zoe', avatar: 'https://i.pravatar.cc/150?u=zoe', hasStory: true },
  { id: 'u4', name: 'Aiden', avatar: 'https://i.pravatar.cc/150?u=aiden', hasStory: true },
];

export const MOCK_POLL: Poll = {
  id: 'p1',
  creator: STORY_USERS[0],
  question: 'Would you date someone your friends dislike?',
  timeAgo: '2h ago',
  options: [
    { id: 'o1', text: 'Yes, my choice', emoji: '💕' },
    { id: 'o2', text: 'No, friends see things', emoji: '👀' },
    { id: 'o3', text: 'Depends why', emoji: '🤔' },
    { id: 'o4', text: 'I need more tea', emoji: '☕' },
  ],
  votes: 128,
  comments: 12,
  shares: 23,
};

export const MOCK_IMAGE_POLL = {
  id: 'p2',
  creator: {
    name: STORY_USERS[0].name,
    avatar: STORY_USERS[0].avatar,
    badge: '👑',
    isCreator: true,
  },
  question: 'Which vacation vibe\nwould you choose?',
  timeAgo: '2h ago',
  options: [
    {
      id: 'o1',
      label: 'Beach escape',
      image: require('../../assets/beach_escape.png'),
    },
    {
      id: 'o2',
      label: 'City nights',
      image: require('../../assets/city_nights.png'),
    },
  ] as [any, any],
  votes: 182,
  comments: 18,
  shares: 27,
};
