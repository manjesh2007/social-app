import { storage } from '@/src/utils/storage';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';
const BASE_API = `${BACKEND_URL}/api`;

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export async function getAuthToken(): Promise<string | null> {
  return await storage.getItem(TOKEN_KEY);
}

export async function setAuthToken(token: string): Promise<void> {
  await storage.setItem(TOKEN_KEY, token);
}

export async function removeAuthToken(): Promise<void> {
  await storage.removeItem(TOKEN_KEY);
  await storage.removeItem(USER_KEY);
}

export async function getStoredUser(): Promise<any | null> {
  const data = await storage.getItem(USER_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export async function setStoredUser(user: any): Promise<void> {
  await storage.setItem(USER_KEY, JSON.stringify(user));
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${BASE_API}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data?.detail || data?.message || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data as T;
}

export const api = {
  // Auth
  register: (body: any) => apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: any) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  getMe: () => apiRequest('/auth/me'),
  updateProfile: (body: any) => apiRequest('/auth/update-profile', { method: 'PUT', body: JSON.stringify(body) }),

  // Feed & Posts
  getFeed: () => apiRequest('/feed'),
  createPost: (body: any) => apiRequest('/posts/create', { method: 'POST', body: JSON.stringify(body) }),
  likePost: (postId: string) => apiRequest(`/posts/${postId}/like`, { method: 'POST' }),
  commentPost: (postId: string, text: string) => apiRequest(`/posts/${postId}/comment`, { method: 'POST', body: JSON.stringify({ text }) }),

  // Friends & Chats
  getFriends: () => apiRequest('/friends'),
  getFriendRequests: () => apiRequest('/friends/requests'),
  sendFriendRequest: (targetUserId: string) => apiRequest('/friends/request/send', { method: 'POST', body: JSON.stringify({ target_user_id: targetUserId }) }),
  respondFriendRequest: (requestId: string, action: 'accept' | 'reject') => apiRequest('/friends/request/respond', { method: 'POST', body: JSON.stringify({ request_id: requestId, action }) }),
  getChats: () => apiRequest('/chats'),
  getChatMessages: (chatId: string) => apiRequest(`/chats/${chatId}/messages`),
  sendMessage: (chatId: string, body: any) => apiRequest(`/chats/${chatId}/send`, { method: 'POST', body: JSON.stringify(body) }),

  // Nearby & Radar
  getNearbyUsers: (params?: { radius_km?: number; gender?: string; interest?: string }) => {
    const query = new URLSearchParams();
    if (params?.radius_km) query.append('radius_km', params.radius_km.toString());
    if (params?.gender && params.gender !== 'All') query.append('gender', params.gender);
    if (params?.interest && params.interest !== 'All') query.append('interest', params.interest);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiRequest(`/nearby${qs}`);
  },

  // Notifications
  getNotifications: () => apiRequest('/notifications'),
  markNotificationsRead: () => apiRequest('/notifications/read-all', { method: 'POST' }),

  // Live Connect
  joinLiveQueue: (preferences?: any) => apiRequest('/live/queue/join', { method: 'POST', body: JSON.stringify(preferences || {}) }),
  leaveLiveQueue: () => apiRequest('/live/queue/leave', { method: 'POST' }),
  sendLiveSignal: (body: any) => apiRequest('/live/signal', { method: 'POST', body: JSON.stringify(body) }),
  reportLiveUser: (body: any) => apiRequest('/live/report', { method: 'POST', body: JSON.stringify(body) }),
};
