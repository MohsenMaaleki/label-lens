import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Scan } from './types';

const SCANS = 'll.scans.v1';
const LANG = 'll.language.v1';
const USAGE = 'll.usage.v1';
const WEEK = 7 * 24 * 60 * 60 * 1000;

export async function loadScans(): Promise<Scan[]> {
  try {
    return JSON.parse((await AsyncStorage.getItem(SCANS)) ?? '[]');
  } catch {
    return [];
  }
}

export async function saveScan(scan: Scan) {
  const all = await loadScans();
  const next = [scan, ...all.filter((s) => s.id !== scan.id)];
  await AsyncStorage.setItem(SCANS, JSON.stringify(next));
  return next;
}

export async function deleteScan(id: string) {
  const next = (await loadScans()).filter((s) => s.id !== id);
  await AsyncStorage.setItem(SCANS, JSON.stringify(next));
  return next;
}

export async function clearScans() {
  await AsyncStorage.removeItem(SCANS);
}

export async function getLanguage() {
  return (await AsyncStorage.getItem(LANG)) ?? null;
}

export async function setLanguage(code: string) {
  await AsyncStorage.setItem(LANG, code);
}

/** Timestamps of free scans in the last 7 days. Local-only; fine for a free tier. */
export async function recentScanCount() {
  const list: number[] = JSON.parse((await AsyncStorage.getItem(USAGE)) ?? '[]');
  return list.filter((t) => Date.now() - t < WEEK).length;
}

export async function recordScan() {
  const list: number[] = JSON.parse((await AsyncStorage.getItem(USAGE)) ?? '[]');
  const fresh = [...list.filter((t) => Date.now() - t < WEEK), Date.now()];
  await AsyncStorage.setItem(USAGE, JSON.stringify(fresh));
}
