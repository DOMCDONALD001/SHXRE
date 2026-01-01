import { useState, useEffect } from 'react';
import { getDoc, doc, onSnapshot } from 'firebase/firestore';
import { usersCollection } from '@lib/firebase/collections';
import { useCacheQuery } from './useCacheQuery';
import type { Query } from 'firebase/firestore';
import type { User } from '@lib/types/user';

type UseCollection<T> = {
  data: T[] | null;
  loading: boolean;
};

type DataWithRef<T> = (T & { createdBy: string })[];
type DataWithUser<T> = UseCollection<T & { user: User }>;

export type UseCollectionOptions = {
  includeUser?: boolean | string;
  allowNull?: boolean;
  disabled?: boolean;
  preserve?: boolean;
};

export function useCollection<T>(
  query: Query<T>,
  options: {
    includeUser: true;
    allowNull?: boolean;
    disabled?: boolean;
    preserve?: boolean;
  }
): DataWithUser<T>;

export function useCollection<T>(
  query: Query<T>,
  options?: UseCollectionOptions
): UseCollection<T>;

export function useCollection<T>(
  query: Query<T>,
  options?: UseCollectionOptions
): UseCollection<T> | DataWithUser<T> {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);

  const cachedQuery = useCacheQuery(query);

  const { includeUser, allowNull, disabled, preserve } = options ?? {};

  useEffect(() => {
    if (disabled) {
      setLoading(false);
      return;
    }

    if (!preserve && data) {
      setData(null);
      setLoading(true);
    }

    const populateUser = async (currentData: DataWithRef<T>): Promise<void> => {
      const dataWithUser = await Promise.all(
        currentData.map(async (currentData) => {
          const userId =
            typeof options?.includeUser === 'string'
              ? (currentData[options.includeUser as keyof typeof currentData] as string)
              : currentData.createdBy;

          const userDocRef = doc(usersCollection, userId);
          try {
            let userSnap = await getDoc(userDocRef);
            if (!userSnap.exists()) {
              try {
                userSnap = await getDoc(userDocRef);
              } catch (cacheErr) {
                console.warn('Failed to read user from cache:', cacheErr);
              }
            }
            return { ...currentData, user: userSnap?.data?.() ?? null };
          } catch (err) {
            console.warn('Failed to fetch user for collection item:', err);
            return { ...currentData, user: null };
          }
        })
      );
      setData(dataWithUser);
      setLoading(false);
    };

    const unsubscribe = onSnapshot(
      cachedQuery,
      (snapshot) => {
        const data = snapshot.docs.map((doc) =>
          doc.data({ serverTimestamps: 'estimate' })
        );

        if (allowNull && !data.length) {
          setData(null);
          setLoading(false);
          return;
        }

        if (includeUser) void populateUser(data as DataWithRef<T>);
        else {
          setData(data);
          setLoading(false);
        }
      },
      (err) => {
        // Log listener errors and avoid leaving the UI stuck in loading state
        // allowNull fallback helps components show an error state instead
        // of an endless spinner while debugging.
        // eslint-disable-next-line no-console
        console.error('useCollection onSnapshot error:', err);
        setLoading(false);
        if (allowNull) setData(null);
      }
    );

    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cachedQuery, disabled]);

  return { data, loading };
}
