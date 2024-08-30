// page.tsx

"use client"; // This directive enables client-side features

import { useState } from 'react';
import Image from 'next/image';

export default function Home() {
  const [restaurantList, setRestaurantList] = useState('');
  const [preferences, setPreferences] = useState('');
  const [errors, setErrors] = useState({ restaurantList: '', preferences: '' });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: { preventDefault: () => void; }) => {
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
      // Process the form submission
      console.log('Restaurant List:', restaurantList);
      console.log('Preferences:', preferences);
      setIsSubmitted(true);
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
          You clicked submit You clicked submit You clicked submit You clicked submit
        </p>
      )}
        </div>
      </form>
    </div>
  );
}
