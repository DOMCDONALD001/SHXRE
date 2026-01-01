import { firestore, regionalFunctions, functions } from './lib/utils';

// Helper to write notifications in batches
async function writeNotificationsBatch(notifications: any[]) {
  if (!notifications.length) return;
  const db = firestore();

  const chunkSize = 400; // keep under 500
  for (let i = 0; i < notifications.length; i += chunkSize) {
    const chunk = notifications.slice(i, i + chunkSize);
    const batch = db.batch();

    chunk.forEach((n) => {
      const ref = db.collection('notifications').doc();
      batch.set(ref, n);
    });

    await batch.commit();
  }
}

async function getParentAuthor(parentId: string) {
  const db = firestore();
  try {
    const parentRef = db.doc(`posts/${parentId}`);
    const snap = await parentRef.get();
    if (snap.exists) {
      const data = snap.data();
      return data?.createdBy ?? null;
    }
    // fallback to legacy tweets
    const legacyRef = db.doc(`tweets/${parentId}`);
    const legacySnap = await legacyRef.get();
    if (legacySnap.exists) {
      const data = legacySnap.data();
      return data?.createdBy ?? null;
    }
  } catch (err) {
    functions.logger.warn('Failed to fetch parent author:', err);
  }
  return null;
}

export const notifyOnPostCreate = regionalFunctions.firestore
  .document('posts/{postId}')
  .onCreate(async (snapshot): Promise<void> => {
    const post = snapshot.data() as any;
    const postId = snapshot.id;
    const author = post.createdBy as string | undefined;

    functions.logger.info(`New post ${postId} by ${author}`);

    if (!author) return;

    const db = firestore();

    // Notify followers that this author posted
    try {
      const authorSnap = await db.doc(`users/${author}`).get();
      if (!authorSnap.exists) return;
      const authorData = authorSnap.data() as any;
      const followers: string[] = authorData?.followers ?? [];

      const notifications = followers.map((followerId) => ({
        type: 'posted',
        userId: author,
        targetUserId: followerId,
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: null,
        isChecked: false,
        meta: { postId }
      }));

      await writeNotificationsBatch(notifications);
    } catch (err) {
      functions.logger.error('Failed to create follower notifications:', err);
    }

    // If this post is a reply, notify the parent author
    if (post.parent) {
      try {
        const parentAuthor = await getParentAuthor(post.parent);
        if (parentAuthor && parentAuthor !== author) {
          await db.collection('notifications').add({
            type: 'reply',
            userId: author,
            targetUserId: parentAuthor,
            createdAt: firestore.FieldValue.serverTimestamp(),
            updatedAt: null,
            isChecked: false,
            meta: { postId, parentId: post.parent }
          });
        }
      } catch (err) {
        functions.logger.warn('Failed to create reply notification:', err);
      }
    }
  });

export const notifyOnPostUpdate = regionalFunctions.firestore
  .document('posts/{postId}')
  .onUpdate(async (change): Promise<void> => {
    const before = change.before.data() as any;
    const after = change.after.data() as any;
    const postId = change.after.id;

    const createdBy = after?.createdBy as string | undefined;
    if (!createdBy) return;

    try {
      // detect new likes
      const beforeLikes: string[] = before?.userLikes ?? [];
      const afterLikes: string[] = after?.userLikes ?? [];
      const addedLikes = afterLikes.filter((id: string) => !beforeLikes.includes(id));

      if (addedLikes.length) {
        const notifications = addedLikes
          .filter((liker) => liker !== createdBy)
          .map((liker) => ({
            type: 'liked',
            userId: liker,
            targetUserId: createdBy,
            createdAt: firestore.FieldValue.serverTimestamp(),
            updatedAt: null,
            isChecked: false,
            meta: { postId }
          }));

        await writeNotificationsBatch(notifications);
      }

      // detect new retweets
      const beforeRT: string[] = before?.userRetweets ?? [];
      const afterRT: string[] = after?.userRetweets ?? [];
      const addedRT = afterRT.filter((id: string) => !beforeRT.includes(id));

      if (addedRT.length) {
        const notifications = addedRT
          .filter((rter) => rter !== createdBy)
          .map((rter) => ({
            type: 'retweet',
            userId: rter,
            targetUserId: createdBy,
            createdAt: firestore.FieldValue.serverTimestamp(),
            updatedAt: null,
            isChecked: false,
            meta: { postId }
          }));

        await writeNotificationsBatch(notifications);
      }
    } catch (err) {
      functions.logger.error('Failed to create update notifications:', err);
    }
  });

// Backwards-compatible triggers for legacy `tweets` collection
export const notifyOnTweetCreate = regionalFunctions.firestore
  .document('tweets/{tweetId}')
  .onCreate(async (snapshot): Promise<void> => {
    // reuse logic by delegating to posts handler: treat tweets as posts
    return notifyOnPostCreate(snapshot as any) as unknown as Promise<void>;
  });

export const notifyOnTweetUpdate = regionalFunctions.firestore
  .document('tweets/{tweetId}')
  .onUpdate(async (change): Promise<void> => {
    return notifyOnPostUpdate(change as any) as unknown as Promise<void>;
  });
