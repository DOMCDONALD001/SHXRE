import { useRouter } from 'next/router';
import Head from 'next/head';
import { siteURL } from '@lib/env';

import type { JSX } from 'react';

type MainLayoutProps = {
  title: string;
  description?: string;
  image?: string | null;
  color?: string;
};

export function SEO({
  title,
  description,
  image,
  color
}: MainLayoutProps): JSX.Element {
  const { asPath } = useRouter();

  return (
    <Head>
      <title>{title}</title>
      <meta property="og:title" content={title} />
      {description && <meta name="description" content={description} />}
      {description && <meta property="og:description" content={description} />}
      <meta property="og:url" content={`${siteURL}${asPath === '/' ? '' : asPath}`} />
      {image && <meta property="og:image" content={image} />}
      <meta name="twitter:card" content={image ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={title} />
      {description && <meta name="twitter:description" content={description} />}
      {image && <meta name="twitter:image" content={image} />}
      <meta name='theme-color' content={color ?? '#1da1f2'} />
    </Head>
  );
}
