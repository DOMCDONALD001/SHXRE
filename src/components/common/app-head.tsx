import Head from 'next/head';

import type { JSX } from 'react';

export function AppHead(): JSX.Element {
  return (
    <Head>
      <title>SHXRE</title>
      <meta name='og:title' content='SHXRE' />
      <link rel='icon' href='/favicon.ico' />
      <link rel='manifest' href='/site.webmanifest' key='site-manifest' />
      <meta name='twitter:site' content='@ccrsxx' />
      <meta name='twitter:card' content='summary_large_image' />
    </Head>
  );
}
