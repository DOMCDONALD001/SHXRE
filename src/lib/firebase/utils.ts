import {
  doc,
  query,
  where,
  limit,
  setDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  increment,
  writeBatch,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  getCountFromServer,
  addDoc,
  getDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  usersCollection,
  postsCollection,
  userStatsCollection,
  userBookmarksCollection,
  notificationsCollection
} from './collections';
import { db, storage } from './app';
import type { Notification } from '@lib/types/notification';
import type { Tweet } from '@lib/types/tweet';
import type { WithFieldValue, Query } from 'firebase/firestore';
import type { EditableUserData } from '@lib/types/user';
import type { FilesWithId, ImagesPreview } from '@lib/types/file';
import type { Bookmark } from '@lib/types/bookmark';
import type { Theme, Accent } from '@lib/types/theme';

export async function checkUsernameAvailability(
  username: string
): Promise<boolean> {
  const { empty } = await getDocs(
    query(usersCollection, where('username', '==', username), limit(1))
  );

  const blacklistedNames = new Set([
    'home',
    'notifications',
    'messages',
    'bookmarks',
    'explore'
  ]);

  if (blacklistedNames.has(username)) return false;

  return empty;
}

function ensureAuth(userId?: string) {
  if (!userId) throw new Error('Authentication required');
}

export async function getCollectionCount<T>(
  collection: Query<T>
): Promise<number> {
  const snapshot = await getCountFromServer(collection);
  return snapshot.data().count;
}

export async function updateUserData(
  userId: string,
  userData: EditableUserData
): Promise<void> {
  ensureAuth(userId);
  const userRef = doc(usersCollection, userId);
  await updateDoc(userRef, {
    ...userData,
    updatedAt: serverTimestamp()
  });
}

export async function updateUserTheme(
  userId: string,
  themeData: { theme?: Theme; accent?: Accent }
): Promise<void> {
  ensureAuth(userId);
  const userRef = doc(usersCollection, userId);
  await updateDoc(userRef, { ...themeData });
}

export async function updateUsername(
  userId: string,
  username?: string
): Promise<void> {
  ensureAuth(userId);
  const userRef = doc(usersCollection, userId);
  await updateDoc(userRef, {
    ...(username && { username }),
    updatedAt: serverTimestamp()
  });
}

export async function managePinnedTweet(
  type: 'pin' | 'unpin',
  userId: string,
  tweetId: string
): Promise<void> {
  ensureAuth(userId);
  const userRef = doc(usersCollection, userId);
  await updateDoc(userRef, {
    updatedAt: serverTimestamp(),
    pinnedTweet: type === 'pin' ? tweetId : null
  });
}

export async function manageFollow(
  type: 'follow' | 'unfollow',
  userId: string,
  targetUserId: string
): Promise<void> {
  ensureAuth(userId);
  const batch = writeBatch(db);

  const userDocRef = doc(usersCollection, userId);
  const targetUserDocRef = doc(usersCollection, targetUserId);

  if (type === 'follow') {
    batch.update(userDocRef, {
      following: arrayUnion(targetUserId),
      updatedAt: serverTimestamp()
    });

    batch.update(targetUserDocRef, {
      followers: arrayUnion(userId),
      updatedAt: serverTimestamp()
    });

    await addDoc(notificationsCollection, {
      type: 'follower',
      userId: userId,
      targetUserId: targetUserId,
      createdAt: serverTimestamp(),
      updatedAt: null,
      isChecked: false
    } as WithFieldValue<Omit<Notification, 'id'>>);
  } else {
    batch.update(userDocRef, {
      following: arrayRemove(targetUserId),
      updatedAt: serverTimestamp()
    });
    batch.update(targetUserDocRef, {
      followers: arrayRemove(userId),
      updatedAt: serverTimestamp()
    });
  }

  await batch.commit();
}

export async function removeTweet(tweetId: string): Promise<void> {
  const postRef = doc(postsCollection, tweetId);
  try {
    await deleteDoc(postRef);
  } catch {
    // ignore
  }
}

export async function uploadImages(
  userId: string,
  files: FilesWithId
): Promise<ImagesPreview | null> {
  ensureAuth(userId);
  if (!files.length) return null;

  const imagesPreview = await Promise.all(
    files.map(async (file) => {
      const { id, name: alt, type } = file;

      const storageRef = ref(storage, `images/${userId}/${id}`);

      try {
        await uploadBytes(storageRef, file);
      } catch (err) {
        throw new Error('Image upload failed');
      }

      const src = await getDownloadURL(storageRef);

      return { id, src, alt, type };
    })
  );

  return imagesPreview;
}

export async function manageReply(
  type: 'increment' | 'decrement',
  tweetId: string
): Promise<void> {
  const postRef = doc(postsCollection, tweetId);
  try {
    await updateDoc(postRef, {
      userReplies: increment(type === 'increment' ? 1 : -1),
      updatedAt: serverTimestamp()
    });
  } catch {
    // do nothing — parent post may have been deleted
  }
}

export async function manageTotalTweets(
  type: 'increment' | 'decrement',
  userId: string
): Promise<void> {
  ensureAuth(userId);
  const userRef = doc(usersCollection, userId);
  await updateDoc(userRef, {
    totalTweets: increment(type === 'increment' ? 1 : -1),
    updatedAt: serverTimestamp()
  });
}

export async function manageTotalPhotos(
  type: 'increment' | 'decrement',
  userId: string
): Promise<void> {
  ensureAuth(userId);
  const userRef = doc(usersCollection, userId);
  await updateDoc(userRef, {
    totalPhotos: increment(type === 'increment' ? 1 : -1),
    updatedAt: serverTimestamp()
  });
}

export function manageRetweet(
  type: 'retweet' | 'unretweet',
  userId: string,
  tweetId: string
) {
  return async (): Promise<void> => {
    ensureAuth(userId);
    const batch = writeBatch(db);
    const postRef = doc(postsCollection, tweetId);
    const userStatsRef = doc(userStatsCollection(userId), 'stats');

    // Prefer updating the new `posts` document; fall back to legacy `tweets`.
      try {
        const snap = await getDoc(postRef as any);
        if (snap.exists()) {
          if (type === 'retweet') {
            batch.update(postRef, {
              userRetweets: arrayUnion(userId),
              updatedAt: serverTimestamp()
            });
            batch.update(userStatsRef, {
              tweets: arrayUnion(tweetId),
              updatedAt: serverTimestamp()
            });
          } else {
            batch.update(postRef, {
              userRetweets: arrayRemove(userId),
              updatedAt: serverTimestamp()
            });
            batch.update(userStatsRef, {
              tweets: arrayRemove(tweetId),
              updatedAt: serverTimestamp()
            });
          }
        }

        await batch.commit();
      } catch (err) {
        // ignore — best-effort only
      }
  };
}

export function manageLike(
  type: 'like' | 'unlike',
  userId: string,
  tweet: Tweet
) {
  return async (): Promise<void> => {
    ensureAuth(userId);
    const tweetId = tweet.id;
    const { createdBy } = tweet;
    const batch = writeBatch(db);

    const userStatsRef = doc(userStatsCollection(userId), 'stats');
    const postRef = doc(postsCollection, tweetId);

    try {
      const snap = await getDoc(postRef as any);
      if (snap.exists()) {
        if (type === 'like') {
          batch.update(postRef, {
            userLikes: arrayUnion(userId),
            updatedAt: serverTimestamp()
          });
          batch.update(userStatsRef, {
            likes: arrayUnion(tweetId),
            updatedAt: serverTimestamp()
          });

          if (createdBy !== userId)
            await addDoc(notificationsCollection, {
              type: 'liked',
              userId: userId,
              targetUserId: createdBy,
              createdAt: serverTimestamp(),
              updatedAt: null,
              isChecked: false
            } as WithFieldValue<Omit<Notification, 'id'>>);
        } else {
          batch.update(postRef, {
            userLikes: arrayRemove(userId),
            updatedAt: serverTimestamp()
          });
          batch.update(userStatsRef, {
            likes: arrayRemove(tweetId),
            updatedAt: serverTimestamp()
          });
        }

        await batch.commit();
      }
    } catch {
      // ignore
    }
  };
}

export async function manageBookmark(
  type: 'bookmark' | 'unbookmark',
  userId: string,
  tweetId: string
): Promise<void> {
  ensureAuth(userId);
  const bookmarkRef = doc(userBookmarksCollection(userId), tweetId);

  if (type === 'bookmark') {
    const bookmarkData: WithFieldValue<Bookmark> = {
      id: tweetId,
      createdAt: serverTimestamp()
    };
    await setDoc(bookmarkRef, bookmarkData);
  } else await deleteDoc(bookmarkRef);
}

export async function clearAllBookmarks(userId: string): Promise<void> {
  const bookmarksRef = userBookmarksCollection(userId);
  const bookmarksSnapshot = await getDocs(bookmarksRef);

  const batch = writeBatch(db);

  bookmarksSnapshot.forEach(({ ref }) => batch.delete(ref));

  await batch.commit();
}
