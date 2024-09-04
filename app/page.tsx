"use client";
import { useState } from 'react';
import axios from 'axios';
import cheerio from 'cheerio';

export default function Home() {
  const [restaurantList, setRestaurantList] = useState('');
  const [preferences, setPreferences] = useState('');
  const [errors, setErrors] = useState({ restaurantList: '', preferences: '' });
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<string | null>(null);

  const handleSubmit = async (e: { preventDefault: () => void; }) => {
    e.preventDefault();
    let hasError = false;

    const newErrors = { restaurantList: '', preferences: '' };

    if (!restaurantList.trim()) {
      newErrors.restaurantList = 'Please paste your restaurant lists.';
      hasError = true;
    }

    if (!preferences.trim()) {
      newErrors.preferences = 'What are your preferences for today?';
      hasError = true;
    }

    setErrors(newErrors);

    if (!hasError) {
      setLoading(true);
      setRecommendation(null); // Reset recommendation before starting a new request
      try {
        const scrapedInfo = await extractLinksAndScrape(restaurantList);
        const summarizedList = await summarizeRestaurants(restaurantList);
        console.log("Summarized list:", summarizedList);
        const places = summarizedList.split(",");
        console.log("Places:", places);
        const allRestaurantsInfo: { [key: string]: any } = {};

        for (const place of places) {
          const placeId = await getPlaceId(place.trim());
          if (placeId) {
            const details = await getPlaceDetails(placeId);
            if (details) {
              allRestaurantsInfo[place.trim()] = details;
            }
          }
        }

        // Merge scraped info with allRestaurantsInfo
        Object.assign(allRestaurantsInfo, scrapedInfo);

        const recommendation = await recommendationToUser(preferences, allRestaurantsInfo);
        setRecommendation(recommendation);
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    }
  };

  const extractLinksAndScrape = async (text: string) => {
    const urlRegex = /(https?:\/\/)?(?:(?:maps\.app\.goo\.gl|(?:www\.)?google\.com\/maps)\/[^\s]+)/g;
    const links = text.match(urlRegex) || [];
    console.log("Found links:", links);
    const scrapedInfo: { [key: string]: string } = {};

    for (const link of links) {
      try {
        if (link.includes('maps.app.goo.gl') || link.includes('google.com/maps')) {
          let expandedUrl = link;
          if (link.includes('maps.app.goo.gl')) {
            expandedUrl = await expandShortUrl(link);
            console.log("Expanded URL:", expandedUrl);
          }
          const placeId = await getPlaceIdFromUrl(expandedUrl);
          if (placeId) {
            const details = await getPlaceDetails(placeId);
            console.log("Details, placeId:", details, placeId);
            if (details) {
              scrapedInfo[link] = JSON.stringify(details);
              console.log(`Scraped information for ${link}:`, details);
            }
          }
        } else {
          // Handle other types of links if needed
          console.log(`Skipping non-Google Maps link: ${link}`);
        }
      } catch (error) {
        console.error(`Error processing ${link}:`, error);
      }
    }

    return scrapedInfo;
  };

  const expandShortUrl = async (shortUrl: string): Promise<string> => {
    try {
      // Ensure the URL starts with https://
      if (!shortUrl.startsWith('http')) {
        shortUrl = 'https://' + shortUrl;
      }
  
      const response = await axios.get('/api/expandUrl', { params: { url: shortUrl } });
      return response.data.expandedUrl;
    } catch (error) {
      console.error('Error expanding short URL:', error);
      return shortUrl;
    }
  };

  const getPlaceIdFromUrl = async (url: string): Promise<string | null> => {
    try {
      // Extract place name from the URL
      const nameMatch = url.match(/\/maps\/place\/([^/@]+)/);
      if (!nameMatch) {
        console.error('Could not extract place name from URL');
        return null;
      }

      const placeName = decodeURIComponent(nameMatch[1]);
      console.log('Extracted place name:', placeName);

      // Extract latitude and longitude from the URL (if available), otherwise defaults to San Francisco coordinates
      const coordMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      let lat = '37.7749';  // Default to San Francisco
      let lng = '-122.4194';
      if (coordMatch) {
        [, lat, lng] = coordMatch;
      }

      // Make request to Find Place API
      const response = await axios.get('/api/findplace', {
        params: {
          input: placeName,
          locationbias: `circle:5000@${lat},${lng}`
        }
      });

      console.log('Find Place API response:', response.data);

      if (response.data.candidates && response.data.candidates.length > 0) {
        return response.data.candidates[0].place_id;
      } else {
        console.error('No place found');
        return null;
      }
    } catch (error) {
      console.error('Error getting place ID from URL:', error);
      return null;
    }
  };

  const getPlaceId = async (placeName: string) => {
    try {
      const response = await axios.get('/api/getPlaceId', { params: { placeName } });
      return response.data.placeId;
    } catch (error) {
      console.error(error);
      return null;
    }
  };

  const getPlaceDetails = async (placeId: string) => {
    try {
      const response = await axios.get('/api/getPlaceDetails', { params: { placeId } });
      return response.data;
    } catch (error) {
      console.error(error);
      return null;
    }
  };

  const summarizeRestaurants = async (restaurants: string) => {
    try {
      const response = await axios.post('/api/openai', { prompt: `Here is a list of restaurants:\n${restaurants}\n\nSummarize the list by providing just the restaurant names in format restaurant1, restaurant2, etc. If you could not find any restaurants, please return ""` });
      return response.data.response;
    } catch (error) {
      console.error(error);
      return null;
    }
  };

  const recommendationToUser = async (userText: string, allRestaurantInfo: any) => {
    console.log("Get to recommendationToUser");
    console.log(allRestaurantInfo);
    try {
      const prompt = `Here is the information about the restaurants that I want you to choose from:\n${JSON.stringify(allRestaurantInfo)}\n\n${userText}. I want you to give me one name of the restaurant that you recommend. If there are any scraped websites, please consider that information as well.`;
      const response = await axios.post('/api/openai', { prompt });
      return response.data.response;
    } catch (error) {
      console.error(error);
      return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-md bg-white p-6 rounded-lg shadow-lg">
        <div className="mb-4">
          <label htmlFor="restaurantList" className="block text-gray-700 text-sm font-bold mb-2">
            Please paste your restaurant lists:
          </label>
          <textarea
            id="restaurantList"
            value={restaurantList}
            onChange={(e) => setRestaurantList(e.target.value)}
            className={`w-full p-2 border ${errors.restaurantList ? 'border-red-500' : 'border-gray-300'} rounded`}
            placeholder="Paste your restaurant list here..."
          />
          {errors.restaurantList && <p className="text-red-500 text-xs italic">{errors.restaurantList}</p>}
        </div>
        <div className="mb-4">
          <label htmlFor="preferences" className="block text-gray-700 text-sm font-bold mb-2">
            What are your preferences for today?
          </label>
          <textarea
            id="preferences"
            value={preferences}
            onChange={(e) => setPreferences(e.target.value)}
            className={`w-full p-2 border ${errors.preferences ? 'border-red-500' : 'border-gray-300'} rounded`}
            placeholder="Enter your preferences here..."
          />
          {errors.preferences && <p className="text-red-500 text-xs italic">{errors.preferences}</p>}
        </div>
        <div className="flex items-center justify-between">
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Submit
          </button>
        </div>

        {loading && (
          <div className="mt-4 text-center">
            <p className="text-blue-500">Loading...</p>
          </div>
        )}

        {recommendation && (
          <div className="mt-4 text-center">
            <p className="text-green-500 text-lg font-bold">Recommendation: {recommendation}</p>
          </div>
        )}
      </form>
    </div>
  );
}
