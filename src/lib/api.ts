import { Poll, PollFeedResponse } from '@/types/pollpop';

const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');
const voterKey = `anon-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;

class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(body.error || `Request failed with ${response.status}`, response.status);
  }

  return response.json();
}

export interface UserProfile {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  bio: string;
  isCreator: boolean;
  hasStory: boolean;
  polls: number;
  followers: number;
  following: number;
}

export interface UserPollSummary {
  id: string;
  question: string;
  category: string;
  timeAgo: string;
  votes: number;
}

export interface ActivityItem {
  id: string;
  type: 'votes' | 'follower' | 'milestone' | 'trending' | string;
  title: string;
  subtitle: string;
  unread: boolean;
  timeAgo: string;
}

export const pollpopApi = {
  getFeed: (params: { category?: string; search?: string; limit?: number } = {}) => {
    const searchParams = new URLSearchParams();
    if (params.category) searchParams.set('category', params.category);
    if (params.search) searchParams.set('search', params.search);
    if (params.limit) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    return request<PollFeedResponse>(`/polls${query ? `?${query}` : ''}`);
  },

  getPoll: async (id: string) => {
    const response = await request<{ poll: Poll }>(`/polls/${id}`);
    return response.poll;
  },

  createPoll: async (input: {
    question: string;
    category: string;
    anonymous: boolean;
    options: { text: string; emoji?: string; imageUrl?: string }[];
  }) => {
    const response = await request<{ poll: Poll }>('/polls', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return response.poll;
  },

  vote: async (pollId: string, optionId: string) => {
    const response = await request<{ poll: Poll; accepted: boolean }>(`/polls/${pollId}/votes`, {
      method: 'POST',
      body: JSON.stringify({ optionId, voterKey }),
    });
    return response;
  },

  uploadMedia: (input: { filename: string; contentType: string; base64: string }) =>
    request<{ key: string; url: string }>('/uploads', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  getUser: async (id: string) => {
    const response = await request<{ user: UserProfile }>(`/users/${id}`);
    return response.user;
  },

  getUserPolls: async (id: string) => {
    const response = await request<{ polls: UserPollSummary[] }>(`/users/${id}/polls`);
    return response.polls;
  },

  getActivity: async (userId: string) => {
    const response = await request<{ activity: ActivityItem[] }>(`/activity/${userId}`);
    return response.activity;
  },
};
