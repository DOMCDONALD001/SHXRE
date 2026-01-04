import type { NextApiRequest, NextApiResponse } from 'next';
import { firebaseAdmin } from '@lib/firebase/app-admn';

// Protected endpoint to create automated news posts.
// Expects header `x-news-secret` matching process.env.NEWS_POST_SECRET
// and a JSON body: { articles: [{ title, description, url, source:{name} }] }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const secret = req.headers['x-news-secret'] as string | undefined;
  if (!secret || secret !== process.env.NEWS_POST_SECRET) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const { articles } = req.body ?? {};
  if (!Array.isArray(articles) || articles.length === 0) {
    return res.status(400).json({ error: 'no articles provided' });
  }

  try {
    const db = firebaseAdmin.firestore();
    const batch = db.batch();

    const botUid = process.env.NEWS_BOT_UID ?? 'news-bot';

    for (const a of articles) {
      const title = (a.title ?? '').toString();
      const description = a.description ? a.description.toString() : '';
      const url = a.url ? a.url.toString() : '';
      const sourceName = a.source?.name ? a.source.name.toString() : '';

      const text = (title + (description ? ` — ${description}` : '')).slice(0, 280);

      const docRef = db.collection('posts').doc();
      batch.set(docRef, {
        text,
        createdBy: botUid,
        createdAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
        source: { name: sourceName, url },
        externalUrl: url,
        isAutomated: true
      });
    }

    await batch.commit();
    return res.status(201).json({ ok: true, created: articles.length });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('news-posts error', err);
    return res.status(500).json({ error: 'server error' });
  }
}
