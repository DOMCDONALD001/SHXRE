import { doc, query, where, getDocs } from 'firebase/firestore';
import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useUser } from '@lib/context/user-context';
import { useCollection } from '@lib/hooks/useCollection';
import { useDocument } from '@lib/hooks/useDocument';
import { postsCollection } from '@lib/firebase/collections';
import { mergeData } from '@lib/merge';
import { UserLayout, ProtectedLayout } from '@components/layout/common-layout';
import { MainLayout } from '@components/layout/main-layout';
import { UserDataLayout } from '@components/layout/user-data-layout';
import { UserHomeLayout } from '@components/layout/user-home-layout';
import { StatsEmpty } from '@components/tweet/stats-empty';
import { Loading } from '@components/ui/loading';
import { Tweet } from '@components/tweet/tweet';
import type { ReactElement, ReactNode, JSX } from 'react';

export default function UserTweets(): JSX.Element {
  const { user } = useUser();

  const { id, username, pinnedTweet } = user ?? {};

  const { data: pinnedData } = useDocument(
    doc(postsCollection, pinnedTweet ?? 'null'),
    {
      disabled: !pinnedTweet,
      allowNull: true,
      includeUser: true
    }
  );

  const { data: ownerTweets, loading: ownerLoading } = useCollection(
    query(postsCollection, where('createdBy', '==', id), where('parent', '==', null)),
    { includeUser: true, allowNull: true }
  );

  const [peopleTweets, setPeopleTweets] = useState<any[] | null>(null);
  const [peopleLoading, setPeopleLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchPeopleTweets = async (): Promise<void> => {
      if (!id) {
        setPeopleTweets(null);
        setPeopleLoading(false);
        return;
      }
      setPeopleLoading(true);
      try {
        // Query only by array-contains to avoid composite-index; filter createdBy client-side
        const snaps = await getDocs(
          query(postsCollection, where('userRetweets', 'array-contains', id))
        );
        const docs = snaps
          .map((d) => d.data({ serverTimestamps: 'estimate' }))
          .filter((doc) => doc.createdBy !== id)
          .sort((a, b) => {
            const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
            const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
            return tb - ta;
          });
        if (!mounted) return;
        setPeopleTweets(docs as any[]);
      } catch (err) {
        console.warn('Failed to fetch people tweets without composite index', err);
        if (!mounted) return;
        setPeopleTweets(null);
      } finally {
        if (!mounted) return;
        setPeopleLoading(false);
      }
    };

    void fetchPeopleTweets();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const mergedTweets = mergeData(true, ownerTweets, peopleTweets);

  return (
    <section>
      {ownerLoading || peopleLoading ? (
        <Loading className='mt-5' />
      ) : !mergedTweets ? (
        <StatsEmpty
          title={`@${username as string} hasn't posted`}
          description='When they do, their posts will show up here.'
        />
      ) : (
        <AnimatePresence mode='popLayout'>
          {pinnedData && (
            <Tweet pinned {...pinnedData} key={`pinned-${pinnedData.id}`} />
          )}
          {mergedTweets
            .filter((tweet) => !pinnedData || tweet.id !== pinnedData.id)
            .map((tweet) => (
              <Tweet {...tweet} profile={user} key={tweet.id} />
            ))}
        </AnimatePresence>
      )}
    </section>
  );
}

UserTweets.getLayout = (page: ReactElement<unknown>): ReactNode => (
  <ProtectedLayout>
    <MainLayout>
      <UserLayout>
        <UserDataLayout>
          <UserHomeLayout>{page}</UserHomeLayout>
        </UserDataLayout>
      </UserLayout>
    </MainLayout>
  </ProtectedLayout>
);
