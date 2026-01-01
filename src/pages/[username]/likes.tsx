import { AnimatePresence } from 'framer-motion';
import { query, where, getDocs } from 'firebase/firestore';
import { useState, useEffect } from 'react';
import { useCollection } from '@lib/hooks/useCollection';
import { postsCollection } from '@lib/firebase/collections';
import { useUser } from '@lib/context/user-context';
import { UserLayout, ProtectedLayout } from '@components/layout/common-layout';
import { MainLayout } from '@components/layout/main-layout';
import { SEO } from '@components/common/seo';
import { UserDataLayout } from '@components/layout/user-data-layout';
import { UserHomeLayout } from '@components/layout/user-home-layout';
import { Tweet } from '@components/tweet/tweet';
import { Loading } from '@components/ui/loading';
import { StatsEmpty } from '@components/tweet/stats-empty';
import type { ReactElement, ReactNode, JSX } from 'react';

export default function UserLikes(): JSX.Element {
  const { user } = useUser();

  const { id, name, username } = user ?? {};

  const [data, setData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchLikes = async (): Promise<void> => {
      if (!id) {
        setData(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        // Fetch by array-contains only to avoid composite index; sort client-side
        const snaps = await getDocs(
          query(postsCollection, where('userLikes', 'array-contains', id))
        );
        const docs = snaps.docs
          .map((d) => d.data({ serverTimestamps: 'estimate' }))
          .sort((a, b) => {
            const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
            const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
            return tb - ta;
          });
        if (!mounted) return;
        setData(docs as any[]);
      } catch (err) {
        console.warn('Failed to fetch likes without composite index', err);
        if (!mounted) return;
        setData(null);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };

    void fetchLikes();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <section>
      <SEO
        title={`Posts liked by ${name as string} (@${
          username as string
        }) / SHXRE`}
      />
      {loading ? (
        <Loading className='mt-5' />
      ) : !data ? (
        <StatsEmpty
          title={`@${username as string} hasn't liked any posts`}
          description='When they do, those posts will show up here.'
        />
      ) : (
        <AnimatePresence mode='popLayout'>
          {data.map((tweet) => (
            <Tweet {...tweet} key={tweet.id} />
          ))}
        </AnimatePresence>
      )}
    </section>
  );
}

UserLikes.getLayout = (page: ReactElement<unknown>): ReactNode => (
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
