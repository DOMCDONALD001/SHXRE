import { useState, useEffect } from 'react';
import { getDoc, doc, onSnapshot } from 'firebase/firestore';
import { usersCollection, postsCollection } from '@lib/firebase/collections';
import { useCacheRef } from './useCacheRef';
import type { DocumentReference } from 'firebase/firestore';
import type { User } from '@lib/types/user';

type UseDocument<T> = {
  data: T | null;
  loading: boolean;
};

type DataWithRef<T> = T & { createdBy: string };
type DataWithUser<T> = UseDocument<T & { user: User }>;

export function useDocument<T>(
  docRef: DocumentReference<T>,
  options: { includeUser: true; allowNull?: boolean; disabled?: boolean }
): DataWithUser<T>;

export function useDocument<T>(
  docRef: DocumentReference<T>,
  options?: { includeUser?: false; allowNull?: boolean; disabled?: boolean }
): UseDocument<T>;

export function useDocument<T>(
  docRef: DocumentReference<T>,
  options?: { includeUser?: boolean; allowNull?: boolean; disabled?: boolean }
): UseDocument<T> | DataWithUser<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  const cachedDocRef = useCacheRef(docRef);

  const { includeUser, allowNull, disabled } = options ?? {};

  useEffect(() => {
    if (disabled) {
      setData(null);
      setLoading(false);
      return;
    }

    setData(null);
    setLoading(true);

    const populateUser = async (currentData: DataWithRef<T>): Promise<void> => {
      try {
        const userDocRef = doc(usersCollection, currentData.createdBy);
        let userData = await getDoc(userDocRef);

        // If offline or network error, try cache fallback
        if (!userData.exists()) {
          try {
            userData = await getDoc(userDocRef);
          } catch (cacheErr) {
            console.warn('Failed to read user from cache:', cacheErr);
          }
        }

        const dataWithUser = { ...currentData, user: userData?.data?.() ?? null };
        setData(dataWithUser as unknown as T & { user: any });
      } catch (err) {
        console.warn('Failed to populate user for document:', err);
        // fallback: set data without user
        setData(currentData as unknown as T);
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe = onSnapshot(
      docRef,
      async (snapshot) => {
      let data = snapshot.data({ serverTimestamps: 'estimate' });

      // If primary collection empty, attempt fallback to `posts` collection
      if (!data && docRef.parent && docRef.parent.id === 'tweets') {
        try {
          const postSnap = await getDoc(doc(postsCollection, docRef.id));
          if (postSnap.exists()) data = postSnap.data({ serverTimestamps: 'estimate' });
        } catch (err) {
          console.warn('Fallback read from posts collection failed:', err);
        }
      }

      if (allowNull && !data) {
        setData(null);
        setLoading(false);
        return;
      }

      if (includeUser) void populateUser(data as DataWithRef<T>);
      else {
        setData(data as T);
        setLoading(false);
      }
      },
      (err) => {
        // Log listener errors and ensure loading is cleared so UI doesn't hang
        // eslint-disable-next-line no-console
        console.error('useDocument onSnapshot error:', err);
        setLoading(false);
        if (allowNull) setData(null);
      }
    );

    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cachedDocRef]);

  return { data, loading };
}
