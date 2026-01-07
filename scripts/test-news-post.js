// Simple test POST to the site's news-posts endpoint
// Usage: NEWS_POST_SECRET=xxx SITE_URL=https://shxre.net node ./scripts/test-news-post.js

async function run() {
  const NEWS_POST_SECRET = process.env.NEWS_POST_SECRET;
  const SITE_URL = process.env.SITE_URL || 'https://shxre.net';

  if (!NEWS_POST_SECRET) {
    console.error('Missing NEWS_POST_SECRET');
    process.exit(1);
  }

  const payload = { articles: [{ title: 'test-post', description: 'test description', url: 'https://example.com', source: { name: 'test' } }] };

  try {
    const res = await fetch(`${SITE_URL}/api/admin/news-posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-news-secret': NEWS_POST_SECRET
      },
      body: JSON.stringify(payload)
    });

    const text = await res.text();
    console.log('STATUS', res.status);
    console.log('BODY', text);
    if (!res.ok) process.exit(1);
  } catch (err) {
    console.error('test post error', err);
    process.exit(1);
  }
}

run();
