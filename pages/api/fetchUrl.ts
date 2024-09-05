import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { pipeline } from '@xenova/transformers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const url = req.query.url as string;
  console.log("url in fetch URL:", url);

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const response = await axios.get(url);
    const content = response.data;

    // Generate embedding
    const generateEmbedding = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    const embedding = await generateEmbedding(content, { pooling: 'mean', normalize: true });

    return res.status(200).json({ 
      content: content,
      embedding: Array.from(embedding.data)
    });
  } catch (error) {
    console.error('Error fetching URL or generating embedding:', error);
    return res.status(500).json({ error: 'Failed to fetch URL content or generate embedding' });
  }
}