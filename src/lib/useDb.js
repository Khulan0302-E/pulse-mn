import { useSyncExternalStore } from 'react';
import { getDb, getVersion, subscribe } from './db';

/** Өгөгдөл өөрчлөгдөх бүрт компонентыг дахин зурна. */
export function useDb() {
  useSyncExternalStore(subscribe, getVersion);
  return getDb();
}
