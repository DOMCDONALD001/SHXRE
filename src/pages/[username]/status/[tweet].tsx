import { useRef } from 'react';
import { useRouter } from 'next/router';
import { AnimatePresence } from 'framer-motion';
import { doc, query, where, orderBy, getDocs } from 'firebase/firestore';
import { postsCollection } from '@lib/firebase/collections';
import { useCollection } from '@lib/hooks/useCollection';
import { useState, useEffect } from 'react';
import { useDocument } from '@lib/hooks/useDocument';
import { isPlural } from '@lib/utils';
import { HomeLayout, ProtectedLayout } from '@components/layout/common-layout';
import { MainLayout } from '@components/layout/main-layout';
import { MainContainer } from '@components/home/main-container';
import { MainHeader } from '@components/home/main-header';
import { Tweet } from '@components/tweet/tweet';
import { ViewTweet } from '@components/view/view-tweet';
import { SEO } from '@components/common/seo';
import { Loading } from '@components/ui/loading';
import { Error } from '@components/ui/error';
import { ViewParentTweet } from '@components/view/view-parent-tweet';
import type { JSX, ReactElement, ReactNode } from 'react';

export default function TweetId(): JSX.Element {
  const {
    query: { tweet },
    back
  } = useRouter();

  const { data: tweetData, loading: tweetLoading } = useDocument(
    doc(postsCollection, tweet as string),
    { includeUser: true, allowNull: true }
  );

  const viewTweetRef = useRef<HTMLElement>(null);

  const [repliesData, setRepliesData] = useState<any[] | null>(null);
  const [repliesLoading, setRepliesLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchReplies = async (): Promise<void> => {
      setRepliesLoading(true);
      try {
        // Avoid composite-index by omitting orderBy; sort client-side
        const q = query(postsCollection, where('parent.id', '==', tweet));
        const snaps = await getDocs(q);
        const docs = snaps.docs
          .map((d) => d.data({ serverTimestamps: 'estimate' }))
          .sort((a, b) => {
            const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
            const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
            return tb - ta;
          });
        if (!mounted) return;
        setRepliesData(docs as any[]);
      } catch (err) {
        console.warn('Failed to fetch replies without index, falling back to null', err);
        if (!mounted) return;
        setRepliesData(null);
      } finally {
        if (!mounted) return;
        setRepliesLoading(false);
      }
    };

    void fetchReplies();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tweet]);

  const { text, images } = tweetData ?? {};

  const imagesLength = images?.length ?? 0;
  const parentId = tweetData?.parent?.id;

  const pageTitle = tweetData
    ? `${tweetData.user.name ?? tweetData.user.username} on SHXRE: "${
        text ?? ''
      }${
        images ? ` (${imagesLength} image${isPlural(imagesLength)})` : ''
      }" / SHXRE`
    : null;

  return (
    <MainContainer className='!pb-[1280px]'>
      <MainHeader
        useActionButton
        title={parentId ? 'Thread' : 'Post'}
        action={back}
      />
      <section>
        {tweetLoading ? (
          <Loading className='mt-5' />
        ) : !tweetData ? (
          <>
            <SEO title='Post not found / SHXRE' />
            <Error message='Post not found' />
          </>
        ) : (
          <>
            {pageTitle && <SEO title={pageTitle} />}
            {parentId && (
              <ViewParentTweet
                parentId={parentId}
                viewTweetRef={viewTweetRef}
              />
            )}
            <ViewTweet viewTweetRef={viewTweetRef} {...tweetData} />
            {tweetData &&
              (repliesLoading ? (
                <Loading className='mt-5' />
              ) : (
                <AnimatePresence mode='popLayout'>
                  {repliesData?.map((tweet) => (
                    <Tweet {...tweet} key={tweet.id} />
                  ))}
                </AnimatePresence>
              ))}
          </>
        )}
      </section>
    </MainContainer>
  );
}

TweetId.getLayout = (page: ReactElement<unknown>): ReactNode => (
  <ProtectedLayout>
    <MainLayout>
      <HomeLayout>{page}</HomeLayout>
    </MainLayout>
  </ProtectedLayout>
);
