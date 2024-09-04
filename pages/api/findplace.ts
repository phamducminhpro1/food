import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { input, locationbias } = req.query;

  if (!input) {
    return res.status(400).json({ error: 'Input parameter is required' });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.error('GOOGLE_MAPS_API_KEY is not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    console.log('Making request to Google Maps API with params:', { input, locationbias });
    const response = await axios.get('https://maps.googleapis.com/maps/api/place/findplacefromtext/json', {
      params: {
        key: apiKey,
        input,
        inputtype: 'textquery',
        locationbias,
        fields: 'place_id,name,formatted_address,geometry'
      }
    });

    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error calling Find Place API:', error);
    res.status(500).json({ error: 'Failed to call Find Place API' });
  }
}
