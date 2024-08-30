from openai import OpenAI
import json
import requests
import sys
import os
from dotenv import load_dotenv
sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()

# Set up your OpenAI API key
OPENAPI = os.getenv('OPENAPI')

# Your Google API key
GOOGLE_API = os.getenv('GOOGLE_API')

# API endpoint for Find Place API
find_place_endpoint = 'https://maps.googleapis.com/maps/api/place/findplacefromtext/json'

# API endpoint for Place Details API
place_details_endpoint = 'https://maps.googleapis.com/maps/api/place/details/json'

#TODO 
# Example usage
restaurants = [
    "Takumi in Eindhoven, Dadawan Eindhoven, Tony Eindhoven, https://www.restaurant-rodeo.nl/"
]
user_text = "I want to eat Japanese food"

def summarize_restaurants(restaurants):
    # Format the input for the model
    restaurant_list_str = "\n".join(restaurants)
    prompt = f"Here is a list of restaurants:\n{restaurant_list_str}\n\nSummarize the list by providing just the restaurant names in format restaruant1, restaurant2, etc"
    client = OpenAI(
        # This is the default and can be omitted
        api_key=OPENAPI,
    )

    response = client.chat.completions.create(
        messages=[
            {
                "role": "user",
                "content": prompt,
            }
        ],
        model="gpt-3.5-turbo",
    )
    # Extract the assistant's message and parse it
    return response.choices[0].message.content





# Function to get place ID using Find Place API
def get_place_id(place_name):
    params = {
        'input': place_name,
        'inputtype': 'textquery',
        'fields': 'place_id',
        'key': GOOGLE_API
    }
    response = requests.get(find_place_endpoint, params=params)
    result = response.json()
    
    if result['candidates']:
        return result['candidates'][0]['place_id']
    else:
        print(f"No place ID found for {place_name}")
        return None

# Function to get place details using Place Details API
def get_place_details(place_id):
    params = {
        'place_id': place_id,
        'fields': 'name,formatted_address,geometry,international_phone_number,website,opening_hours,rating,review,user_ratings_total',
        'key': GOOGLE_API
    }
    response = requests.get(place_details_endpoint, params=params)
    return response.json()

def recommendation_to_user(user_text, all_restaurant_info):  
    # TODO add edge case when the user text does not make sense 
    # return the name of the pages, and information 
    prompt = f"Here is the informations about the restaurants that I want you to choose from:\n{all_restaurant_info}\n\n. {user_text}. I want you to give me one name of the restaurant that you recommend"
    client = OpenAI(
        # This is the default and can be omitted
        api_key=OPENAPI,
    )

    response = client.chat.completions.create(
        messages=[
            {
                "role": "user",
                "content": prompt,
            }
        ],
        model="gpt-3.5-turbo",
    )
    return response.choices[0].message.content

def main(): 
    summarized_list = summarize_restaurants(restaurants)
    places = summarized_list.split(",")

    all_restaurants_info = dict()
    # Loop through each place, get place ID and then get detailed information
    for place in places:
        place_id = get_place_id(place)
        if place_id:
            try: 
                details = get_place_details(place_id)
                all_restaurants_info[place] = details 
            except Exception as e: 
                print(e)

    # # TODO add the details 
    recommendation = recommendation_to_user(user_text, all_restaurants_info)
    print(recommendation)

    
if __name__ == "__main__":
    main()
