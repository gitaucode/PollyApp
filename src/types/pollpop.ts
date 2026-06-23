export interface User {
  id: string;
  name: string;
  handle?: string;
  avatar: string;
  hasStory?: boolean;
  isCreator?: boolean;
}

export interface PollOption {
  id: string;
  text: string;
  emoji?: string;
  imageUrl?: string | null;
  votes?: number;
  percentage?: number;
}

export interface Poll {
  id: string;
  creator: User;
  question: string;
  category: string;
  anonymous: boolean;
  timeAgo: string;
  options: PollOption[];
  votes: number;
  comments: number;
  shares: number;
  isSaved?: boolean;
  votedOptionId?: string | null;
}

export interface CreatorSummary {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  polls: number;
  isFollowing?: boolean;
}

export interface ConnectionUser {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  isCreator: boolean;
  isFollowing?: boolean;
}

export interface PollFeedResponse {
  polls: Poll[];
  stories: User[];
  creators: CreatorSummary[];
}
