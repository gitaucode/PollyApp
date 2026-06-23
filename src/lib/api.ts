import { getAccessToken, getSessionUserId } from '@/lib/auth-storage';
import { Poll, PollFeedResponse, ConnectionUser } from '@/types/pollpop';

const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'https://pollpop-api.stephen-gitau.workers.dev').replace(/\/$/, '');

class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit, token?: string | null): Promise<T> {
  const accessToken = token ?? getAccessToken();
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
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
  isFollowing?: boolean;
}

export interface AuthUserProfile extends UserProfile {
  email: string;
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
  type: 'votes' | 'follower' | 'milestone' | 'trending' | 'comment' | string;
  title: string;
  subtitle: string;
  unread: boolean;
  timeAgo: string;
  pollId?: string | null;
}

export interface PollComment {
  id: string;
  body: string;
  timeAgo: string;
  author: {
    id: string;
    name: string;
    handle: string;
    avatar: string;
  };
}

interface AuthResponse {
  token: string;
  user: AuthUserProfile;
}

export const pollpopApi = {
  register: (name: string, email: string, password: string) =>
    request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),

  login: (email: string, password: string) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  getMe: (token?: string) => request<AuthResponse>('/auth/me', { method: 'GET' }, token),

  getFeed: async (params: { category?: string; search?: string; limit?: number; mode?: 'following' | 'trending' } = {}) => {
    const userId = getSessionUserId();
    const searchParams = new URLSearchParams();
    if (params.category) searchParams.set('category', params.category);
    if (params.search) searchParams.set('search', params.search);
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.mode === 'following') searchParams.set('mode', 'following');
    if (userId) searchParams.set('userId', userId);
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

  vote: async (pollId: string, optionId: string) =>
    request<{ poll: Poll; accepted: boolean }>(`/polls/${pollId}/votes`, {
      method: 'POST',
      body: JSON.stringify({ optionId }),
    }),

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

  getSavedPolls: async (userId: string) => {
    const response = await request<{ polls: UserPollSummary[] }>(`/users/${userId}/saved`);
    return response.polls;
  },

  toggleSavePoll: async (pollId: string, save: boolean) => {
    const response = await request<{ saved: boolean }>(`/polls/${pollId}/save`, {
      method: 'POST',
      body: JSON.stringify({ save }),
    });
    return response.saved;
  },

  getComments: async (pollId: string) => {
    const response = await request<{ comments: PollComment[] }>(`/polls/${pollId}/comments`);
    return response.comments;
  },

  addComment: async (pollId: string, body: string) => {
    const response = await request<{ comment: PollComment }>(`/polls/${pollId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    });
    return response.comment;
  },

  getActivity: async (userId: string) => {
    const response = await request<{ activity: ActivityItem[] }>(`/activity/${userId}`);
    return response.activity;
  },

  markActivityRead: async (userId: string, options: { markAll?: boolean; activityId?: string } = { markAll: true }) =>
    request<{ success: boolean }>(`/activity/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(options),
    }),

  toggleFollow: async (creatorId: string, follow: boolean) => {
    const response = await request<{ following: boolean }>(`/users/${creatorId}/follow`, {
      method: 'POST',
      body: JSON.stringify({ follow }),
    });
    return response.following;
  },

  getFollowers: async (userId: string) => {
    const response = await request<{ users: ConnectionUser[] }>(`/users/${userId}/followers`);
    return response.users;
  },

  getFollowing: async (userId: string) => {
    const response = await request<{ users: ConnectionUser[] }>(`/users/${userId}/following`);
    return response.users;
  },

  updateUser: async (userId: string, name: string, bio: string) => {
    const response = await request<{ success: boolean; name: string; bio: string }>(`/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ name, bio }),
    });
    return response;
  },
};
