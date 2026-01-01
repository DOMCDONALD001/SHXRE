import { useState, useEffect, useMemo } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { usersCollection, postsCollection } from '@lib/firebase/collections';
import type { CollectionReference } from 'firebase/firestore';
import type { User } from '@lib/types/user';

type UserArrayDocument<T> = {
  data: T[] | null;
  loading: boolean;
};

type DataWithRef<T> = (T & { createdBy: string })[];
type DataWithUser<T> = UserArrayDocument<T & { user: User }>;

export function useArrayDocument<T>(
  docsIds: string[],
  collectionRef: CollectionReference<T>,
  options?: { includeUser?: true; disabled?: boolean }
): DataWithUser<T>;

export function useArrayDocument<T>(
  docsIds: string[],
  collectionRef: CollectionReference<T>,
  options?: { includeUser?: false; disabled?: boolean }
): UserArrayDocument<T>;

export function useArrayDocument<T>(
  docsId: string[],
  collection: CollectionReference<T>,
  options?: { includeUser?: boolean; disabled?: boolean }
): UserArrayDocument<T> | DataWithUser<T> {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);

  const cachedDocsId = useMemo(() => docsId, [docsId]);

  const { includeUser, disabled } = options ?? {};

  useEffect(() => {
    if (disabled) return;

    if (includeUser && !data) setLoading(true);

    const populateUser = async (currentData: DataWithRef<T>): Promise<void> => {
      const dataWithUser = await Promise.all(
        currentData.map(async (currentData) => {
          const userDocRef = doc(usersCollection, currentData.createdBy);
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
            console.warn('Failed to fetch user for array document:', err);
            return { ...currentData, user: null };
          }
        })
      );
      setData(dataWithUser);
      setLoading(false);
    };

    const fetchData = async (): Promise<void> => {
      try {
        const docsSnapshot = await Promise.all(
          cachedDocsId.map(async (id) => {
            const docRef = doc(collection, id);
            try {
              let snap = await getDoc(docRef);
              if (!snap.exists()) {
                try {
                  snap = await getDoc(docRef);
                } catch (cacheErr) {
                  console.warn('Failed to read doc from cache:', cacheErr);
                }
                // Fallback: if we're looking up legacy `tweets` and the doc
                // doesn't exist there, try the `posts` collection (migration support)
                try {
                  // collection.id should be 'tweets' for legacy collection refs
                  // only attempt fallback when appropriate
                   if ((collection as any).id === 'tweets') {
                    const fallbackRef = doc(postsCollection, id);
                    const fallbackSnap = await getDoc(fallbackRef);
                    if (fallbackSnap.exists()) return fallbackSnap;
                  }
                } catch (fbErr) {
                  console.warn('Failed to fetch fallback doc from posts:', fbErr);
                }
              }
              return snap;
              } catch (err) {
              try {
                return await getDoc(docRef);
              } catch (cacheErr) {
                console.warn('Failed to fetch doc (network+cache):', err, cacheErr);
                return null;
              }
            }
          })
        );

        const docs = docsSnapshot
          .filter((snap) => snap && snap.exists())
          .map((snap) => snap!.data({ serverTimestamps: 'estimate' }));

        if (!docs.length) {
          setData(null);
          setLoading(false);
          return;
        }

        if (includeUser) void populateUser(docs as DataWithRef<T>);
        else {
          setData(docs as T[]);
          setLoading(false);
        }
      } catch {
        setData(null);
        setLoading(false);
      }
    };

    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cachedDocsId]);

  return { data, loading };
}
