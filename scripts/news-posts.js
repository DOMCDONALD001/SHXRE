// Fetch headlines from NewsAPI and POST them to the site's admin API
// Requires environment variables: NEWSAPI_KEY, NEWS_POST_SECRET, SITE_URL, SOURCES (comma-separated)

async function run() {
  const NEWSAPI_KEY = process.env.NEWSAPI_KEY;
  const NEWS_POST_SECRET = process.env.NEWS_POST_SECRET;
  const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';
  const SOURCES = process.env.SOURCES || ''; // comma-separated list of sources (eg: bbc-news,cnn)

  if (!NEWSAPI_KEY || !NEWS_POST_SECRET) {
    console.error('Missing NEWSAPI_KEY or NEWS_POST_SECRET');
    process.exit(1);
  }

  const sourcesParam = SOURCES ? `&sources=${encodeURIComponent(SOURCES)}` : '';
  const url = `https://newsapi.org/v2/top-headlines?language=en${sourcesParam}&pageSize=5`;

  const res = await fetch(url, {
    headers: { 'X-Api-Key': NEWSAPI_KEY }
  });

  if (!res.ok) {
    console.error('NewsAPI fetch failed', res.status, await res.text());
    process.exit(1);
  }

  const body = await res.json();
  const articles = (body.articles || []).map((a) => ({
    title: a.title,
    description: a.description,
    url: a.url,
    source: { name: a.source?.name }
  }));

  if (!articles.length) {
    console.log('No articles found');
    return;
  }

  // POST to site API
  const apiRes = await fetch(`${SITE_URL}/api/admin/news-posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-news-secret': NEWS_POST_SECRET
    },
    body: JSON.stringify({ articles })
  });

  if (!apiRes.ok) {
    console.error('POST to site failed', apiRes.status, await apiRes.text());
    process.exit(1);
  }

  console.log('Posted', articles.length, 'articles');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
