"use client";
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import EmbeddedContent from './components/EmbeddedContent';
import { ChevronDownIcon, PlusIcon } from '@heroicons/react/24/solid';
import Image from 'next/image';

export default function Home() {
  const [location, setLocation] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [transportation, setTransportation] = useState('');
  const [restaurantList, setRestaurantList] = useState(['', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState({ lat: '37.7749', lng: '-122.4194' });
  const [embeddedUrl, setEmbeddedUrl] = useState<string | null>(null);
  const [radius, setRadius] = useState('');
  const [showCriteria, setShowCriteria] = useState(true);

  const getUserLocation = useCallback(() => {
    if ("geolocation" in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'granted') {
          // Permission already granted, get location
          getPosition();
        } else if (result.state === 'prompt') {
          // Permission hasn't been requested yet, clicking will trigger the browser's permission prompt
          getPosition();
        } else if (result.state === 'denied') {
          // Permission has been denied
          alert("Location permission is denied. Please enable it in your browser settings.");
        }
      });
    } else {
      console.log("Geolocation is not available in this browser.");
      alert("Geolocation is not supported by your browser. Please enter your location manually.");
    }
  }, []);

  const getPosition = () => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude.toString(),
          lng: position.coords.longitude.toString()
        });
        console.log("User location:", position.coords.latitude, position.coords.longitude);
        setLocation("Current Location");
      },
      (error) => {
        console.error("Error getting location:", error);
        alert("Unable to retrieve your location. Please enter it manually.");
      }
    );
  };

  useEffect(() => {
    getUserLocation();
  }, [getUserLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setRecommendation(null);

    const { lat, lng } = userLocation;

    // Combine all preferences
    const combinedPreferences = `Location: ${location}\nCuisine: ${cuisine}\nTransportation: ${transportation}\nRestaurant List: ${restaurantList.filter(r => r).join(', ')}`;
    
    try {
      const allRestaurantsInfo: { [key: string]: any } = {};

      for (const place of restaurantList.filter(r => r)) {
        const placeId = await getPlaceId(place.trim());
        if (placeId) {
          const details = await getPlaceDetails(placeId);
          if (details) {
            allRestaurantsInfo[place.trim()] = details;
          }
        }
      }

      const recommendation = await recommendationToUser(combinedPreferences, allRestaurantsInfo);
      setRecommendation(recommendation);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
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

  const addRestaurantField = () => {
    setRestaurantList([...restaurantList, '']);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-white">
      <div className="w-full max-w-md bg-yellow-50 p-6 rounded-lg shadow-lg">
        <div className="mb-4 text-center">
          <Image
            src="/logo.png"
            alt="I don't know where to eat"
            width={100}
            height={80}
            layout="responsive"
          />
        </div>
        
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">My criteria</h2>
          <button 
            onClick={() => setShowCriteria(!showCriteria)}
            className="p-1 rounded-full hover:bg-gray-200 transition-colors duration-200"
            aria-label={showCriteria ? "Hide criteria" : "Show criteria"}
          >
            <ChevronDownIcon 
              className={`w-6 h-6 text-gray-600 transform transition-transform duration-200 ${showCriteria ? 'rotate-180' : ''}`}
            />
          </button>
        </div>

        {showCriteria && (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
            <label htmlFor="cuisine" className="block text-gray-700 text-sm font-bold mb-2">
                Location *
                </label>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex-grow min-w-0 max-w-[60%]">
                
                  <div className="relative">
                    <input
                      type="text"
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full h-10 p-2 pr-24 border border-gray-300 rounded text-sm"
                      placeholder="Type your zip code"
                    />
                    <button 
                      type="button" 
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 bg-yellow-400 text-black px-2 py-1 rounded text-xs font-medium"
                      onClick={getUserLocation}
                    >
                      Locate me
                    </button>
                  </div>
                </div>
                <span className="text-sm whitespace-nowrap">or</span>
                <div className="flex-shrink-0">
                  <input
                    type="text"
                    id="radius"
                    value={radius}
                    onChange={(e) => setRadius(e.target.value)}
                    className="w-28 h-10 p-2 border border-gray-300 rounded text-sm"
                    placeholder="Within radius"
                  />
                </div>
              </div>
            </div>
            <div className="mb-4">
              <label htmlFor="cuisine" className="block text-gray-700 text-sm font-bold mb-2">
                The kind of restaurant I'm looking for *
              </label>
              <input
                type="text"
                id="cuisine"
                value={cuisine}
                onChange={(e) => setCuisine(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
                placeholder="E.g. Chinese, fun vibe, near the A train, high ratings"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="transportation" className="block text-gray-700 text-sm font-bold mb-2">
                How I get there
              </label>
              <input
                type="text"
                id="transportation"
                value={transportation}
                onChange={(e) => setTransportation(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
                placeholder="E.g. Less than 30 mins travel, by A train subway"
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Some restaurants I have in mind
              </label>
              {restaurantList.map((restaurant, index) => (
                <input
                  key={index}
                  type="text"
                  value={restaurant}
                  onChange={(e) => {
                    const newList = [...restaurantList];
                    newList[index] = e.target.value;
                    setRestaurantList(newList);
                  }}
                  className="w-full p-2 border border-gray-300 rounded mb-2"
                  placeholder={`${index + 1}. Type name or paste link`}
                />
              ))}
            </div>
            <div className="flex items-center justify-center">
              <button
                type="submit"
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded w-full"
              >
                Give me a recommendation
              </button>
            </div>
          </form>
        )}

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
