/**
 * Qurilmada saqlash — sessiya tokeni va sozlamalar.
 *
 * Telefonda `expo-secure-store` (Android Keystore / iOS Keychain):
 * sessiya tokeni obunachining yoʻlini ochadigan kalit, oddiy faylda
 * turmasin. Webda (koʻrib chiqish uchun) SecureStore yoʻq — `localStorage`.
 *
 * Oʻqib boʻlmasa `null` — bu xato emas, "hali saqlanmagan" degani.
 */

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export async function ol(kalit: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web') return globalThis.localStorage?.getItem(kalit) ?? null;
    return await SecureStore.getItemAsync(kalit);
  } catch {
    return null;
  }
}

export async function yoz(kalit: string, qiymat: string): Promise<void> {
  try {
    if (Platform.OS === 'web') { globalThis.localStorage?.setItem(kalit, qiymat); return; }
    await SecureStore.setItemAsync(kalit, qiymat);
  } catch {
    /* saqlanmadi — keyingi ochilishda yangidan soʻraladi */
  }
}

