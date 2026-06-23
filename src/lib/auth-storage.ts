import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/** SecureStore keys: alphanumeric plus ".", "-", "_" only — no colons. */
const TOKEN_KEY = 'pollpop.auth.token';
const USER_ID_KEY = 'pollpop.auth.user_id';
const LEGACY_TOKEN_KEY = 'pollpop:authToken';
const LEGACY_USER_ID_KEY = 'pollpop:userId';

let memoryToken: string | null = null;
let memoryUserId: string | null = null;

async function getItem(key: string) {
  if (Platform.OS === 'web') return AsyncStorage.getItem(key);
  return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string) {
  if (Platform.OS === 'web') return AsyncStorage.setItem(key, value);
  return SecureStore.setItemAsync(key, value);
}

async function deleteItem(key: string) {
  if (Platform.OS === 'web') return AsyncStorage.removeItem(key);
  return SecureStore.deleteItemAsync(key);
}

async function readWithLegacyFallback(primaryKey: string, legacyKey: string) {
  const value = await getItem(primaryKey);
  if (value) return value;

  const legacy = await getItem(legacyKey);
  if (legacy) {
    await setItem(primaryKey, legacy);
    await deleteItem(legacyKey);
  }
  return legacy;
}

export async function hydrateAuthSession() {
  memoryToken = await readWithLegacyFallback(TOKEN_KEY, LEGACY_TOKEN_KEY);
  memoryUserId = await readWithLegacyFallback(USER_ID_KEY, LEGACY_USER_ID_KEY);
  return { token: memoryToken, userId: memoryUserId };
}

export function getAccessToken() {
  return memoryToken;
}

export function getSessionUserId() {
  return memoryUserId;
}

export async function saveAuthSession(token: string, userId: string) {
  memoryToken = token;
  memoryUserId = userId;
  await setItem(TOKEN_KEY, token);
  await setItem(USER_ID_KEY, userId);
  await deleteItem(LEGACY_TOKEN_KEY);
  await deleteItem(LEGACY_USER_ID_KEY);
}

export async function clearAuthSession() {
  memoryToken = null;
  memoryUserId = null;
  await deleteItem(TOKEN_KEY);
  await deleteItem(USER_ID_KEY);
  await deleteItem(LEGACY_TOKEN_KEY);
  await deleteItem(LEGACY_USER_ID_KEY);
}

export async function updateAccessToken(token: string) {
  memoryToken = token;
  await setItem(TOKEN_KEY, token);
}
