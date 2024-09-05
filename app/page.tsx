"use client";
import { useState, useEffect } from 'react';
import axios from 'axios';
import EmbeddedContent from './components/EmbeddedContent';

export default function Home() {
  const [cuisine, setCuisine] = useState('');
  const [location, setLocation] = useState('');
  const [transportation, setTransportation] = useState('');
  const [restaurantList, setRestaurantList] = useState('');
  const [otherPreferences, setOtherPreferences] = useState('');
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState({ lat: '37.7749', lng: '-122.4194' });
  const [embeddedUrl, setEmbeddedUrl] = useState<string | null>(null);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude.toString(),
            lng: position.coords.longitude.toString()
          });
          console.log("User location:", position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    } else {
      console.log("Geolocation is not available in this browser.");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setRecommendation(null);

    // Log user input including location
    // console.log('User Input:');
    // console.log('Cuisine:', cuisine);
    // console.log('Location:', location);
    // console.log('Transportation:', transportation);
    // console.log('Restaurant List:', restaurantList);
    // console.log('Other Preferences:', otherPreferences);
    // console.log('User Location:', userLocation);

    // Use userLocation in your API calls or logic
    const { lat, lng } = userLocation;

    // Combine all preferences
    const combinedPreferences = `Cuisine: ${cuisine}\nLocation: ${location}\nTransportation: ${transportation}\nOther Preferences: ${otherPreferences}`;
    console.log('Combined Preferences:', combinedPreferences);
    
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

      const recommendation = await recommendationToUser(combinedPreferences, allRestaurantsInfo);
      setRecommendation(recommendation);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
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
      
      //TODO: I will get the current location from the user. 

      
      console.log("Call find place API with Lat, lng and place name:", lat, lng, placeName);
      // Make request to Find Place API
      
      const response = await axios.get('/api/findplace', {
        params: {
          input: placeName,
          inputtype: 'textquery',
          locationbias: `circle:5000@${lat},${lng}`,
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
      const prompt = `Here is the information about the restaurants that I want you to choose from:\n${JSON.stringify(allRestaurantInfo)}\n\n${userText}. I want you to give me one name and the link of the website of the restaurant that you recommend. If there are any scraped websites, please consider that information as well.`;
      const response = await axios.post('/api/openai', { prompt });
      
      // Check for URL in the recommendation
      const urlRegex = /(https?:\/\/[^\s]+[^\s.,;:!?)]?)(?=[.,;:!?]?\s|$)/g;
      const urls = response.data.response.match(urlRegex);
      if (urls && urls.length > 0) {
        let url = urls[0];
        // Remove closing parenthesis and anything after the last forward slash
        const lastSlashIndex = url.lastIndexOf('/');
        if (lastSlashIndex !== -1) {
          url = url.substring(0, lastSlashIndex + 1);
        }
        // Remove trailing punctuation
        url = url.replace(/[.,;:!?)]$/, '');
        // Use the hardcoded URL
        // url = "https://www.google.com/maps/place/Susuru+Ramen/@40.7246839,-152.0005254,4z/data=!4m10!1m3!11m2!2smbYUqCVqvg0IlPZuGmIQNsGvNDQsQw!3e3!3m5!1s0x89c25f9b142d6e23:0x304cd8c57ee5e21b!8m2!3d40.75567!4d-73.927344!16s%2Fg%2F11n5qbt5_5?entry=ttu&g_ep=EgoyMDI0MDkwMi4xIKXMDSoASAFQAw%3D%3D";
        console.log("This is the urls:", url);
        setEmbeddedUrl(url);
      } else {
        setEmbeddedUrl(null);
      }

      return response.data.response;
    } catch (error) {
      console.error(error);
      return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-100">
      <div className="w-full max-w-md bg-white p-6 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold mb-6 text-center">FoodTrail</h1>
        <h2 className="text-xl font-semibold mb-4">Criteria</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="cuisine" className="block text-gray-700 text-sm font-bold mb-2">
              Cuisine
            </label>
            <input
              type="text"
              id="cuisine"
              value={cuisine}
              onChange={(e) => setCuisine(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded bg-yellow-50"
              placeholder="Type your preferred cuisine here"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="location" className="block text-gray-700 text-sm font-bold mb-2">
              Location (City)
            </label>
            <input
              type="text"
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded bg-yellow-50"
              placeholder="e.g. near this subway station, under 30 mins for travel..."
            />
          </div>
          <div className="mb-4">
            <label htmlFor="transportation" className="block text-gray-700 text-sm font-bold mb-2">
              Transportation/Distance (optional)
            </label>
            <input
              type="text"
              id="transportation"
              value={transportation}
              onChange={(e) => setTransportation(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded bg-yellow-50"
              placeholder="e.g. near this subway station, under 30 mins for travel..."
            />
          </div>
          <div className="mb-4">
            <label htmlFor="restaurantList" className="block text-gray-700 text-sm font-bold mb-2">
              My list (optional)
            </label>
            <textarea
              id="restaurantList"
              value={restaurantList}
              onChange={(e) => setRestaurantList(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded bg-yellow-50"
              placeholder="Paste your list here"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="otherPreferences" className="block text-gray-700 text-sm font-bold mb-2">
              Notes and other preferences
            </label>
            <textarea
              id="otherPreferences"
              value={otherPreferences}
              onChange={(e) => setOtherPreferences(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded bg-yellow-50"
              placeholder="Enter other preferences or special requests..."
              rows={3}
            />
          </div>
          <div className="flex items-center justify-center">
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded w-full"
            >
              Give me a recommendation
            </button>
          </div>
        </form>

        {loading && (
          <div className="mt-4 text-center">
            <p className="text-blue-500">Loading...</p>
          </div>
        )}

        {recommendation && (
          <div className="mt-4 text-center">
            <p className="text-green-500 text-lg font-bold">Recommendation: {recommendation}</p>
            {embeddedUrl && <EmbeddedContent url={embeddedUrl} />}
          </div>
        )}
      </div>
    </div>
  );
}
