"use client";
import { useState } from 'react';
import axios from 'axios';

export default function Home() {
  const [restaurantList, setRestaurantList] = useState('');
  const [preferences, setPreferences] = useState('');
  const [errors, setErrors] = useState({ restaurantList: '', preferences: '' });
  const [isSubmitted, setIsSubmitted] = useState(false);

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
      try {
        const summarizedList = await summarizeRestaurants(restaurantList);
        const places = summarizedList.split(",");
        console.log(places);
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

        const recommendation = await recommendationToUser(preferences, allRestaurantsInfo);
        console.log(recommendation);
        setIsSubmitted(true);
      } catch (error) {
        console.log(error);
      }
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
      const response = await axios.post('/api/openai', { prompt: `Here is a list of restaurants:\n${restaurants}\n\nSummarize the list by providing just the restaurant names in format restaurant1, restaurant2, etc` });
      return response.data.response;
    } catch (error) {
      console.error(error);
      return null;
    }
  };

  const recommendationToUser = async (userText: string, allRestaurantInfo: any) => {
    try {
      const prompt = `Here is the information about the restaurants that I want you to choose from:\n${JSON.stringify(allRestaurantInfo)}\n\n${userText}. I want you to give me one name of the restaurant that you recommend.`;
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
          {isSubmitted && (
            <p className="mt-4 text-green-500 text-lg font-bold">
              You clicked submit
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
