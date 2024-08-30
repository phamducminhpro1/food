import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { placeName } = req.query;

  try {
    const response = await axios.get('https://maps.googleapis.com/maps/api/place/findplacefromtext/json', {
      params: {
        input: placeName,
        inputtype: 'textquery',
        fields: 'place_id',
        key: GOOGLE_API_KEY,
      },
    });

    if (response.data.candidates.length > 0) {
      res.status(200).json({ placeId: response.data.candidates[0].place_id });
    } else {
      res.status(404).json({ error: 'Place not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
