import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { placeId } = req.query;

  try {
    const response = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
      params: {
        place_id: placeId,
        fields: 'name,formatted_address,geometry,international_phone_number,website,opening_hours,rating,review,user_ratings_total',
        key: GOOGLE_API_KEY,
      },
    });

    res.status(200).json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
