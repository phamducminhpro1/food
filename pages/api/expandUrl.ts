import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL parameter is required and must be a string' });
  }

  try {
    const response = await axios.get(url, {
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 400
    });

    let expandedUrl = url;

    if (response.headers.location) {
      expandedUrl = response.headers.location;
    } else {
      // If no redirect, try to extract the URL from the HTML content
      const match = response.data.match(/URL='([^']+)'/);
      if (match && match[1]) {
        expandedUrl = match[1];
      }
    }

    res.status(200).json({ expandedUrl });
  } catch (error) {
    console.error('Error expanding URL:', error);
    res.status(500).json({ error: 'Failed to expand URL' });
  }
}