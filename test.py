from openai import OpenAI
import json
import requests
import sys
import os
from dotenv import load_dotenv
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
import time
from selenium.common.exceptions import TimeoutException

sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()

# Set up your OpenAI API key
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')

# Your Google API key
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')

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
        api_key=OPENAI_API_KEY,
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
        'key': GOOGLE_API_KEY
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
    print(GOOGLE_API_KEY)
    params = {
        'place_id': place_id,
        'fields': 'name,formatted_address,geometry,international_phone_number,website,opening_hours,rating,review,user_ratings_total',
        'key': GOOGLE_API_KEY
    }
    response = requests.get(place_details_endpoint, params=params)
    return response.json()

def recommendation_to_user(user_text, all_restaurant_info):  
    # TODO add edge case when the user text does not make sense 
    # return the name of the pages, and information 
    prompt = f"Here is the informations about the restaurants that I want you to choose from:\n{all_restaurant_info}\n\n. {user_text}. I want you to give me one name of the restaurant that you recommend"
    client = OpenAI(
        # This is the default and can be omitted
        api_key=OPENAI_API_KEY,
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

# def main(): 
#     summarized_list = summarize_restaurants(restaurants)
#     places = summarized_list.split(",")

#     all_restaurants_info = dict()
#     # Loop through each place, get place ID and then get detailed information
#     for place in places:
#         place_id = get_place_id(place)
#         if place_id:
#             try: 
#                 details = get_place_details(place_id)
#                 all_restaurants_info[place] = details 
#             except Exception as e: 
#                 print(e)

    # # # TODO add the details 
    # recommendation = recommendation_to_user(user_text, all_restaurants_info)
    # print(recommendation)

import logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def scrape_google_maps_list(url):
    logger.info(f"Starting scrape for URL: {url}")

    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument('--blink-settings=imagesEnabled=false')
    logger.info("Chrome options set up")

    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)
    logger.info("Chrome driver initialized")

    try:
        driver.get(url)
        wait = WebDriverWait(driver, 60)
        wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
        logger.info(f"Page loaded. Current URL: {driver.current_url}")
        logger.info(f"Page source length: {len(driver.page_source)}")

        try:
            consent_button = WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Accept all')]"))
            )
            consent_button.click()
            logger.info("Consent button clicked")
        except TimeoutException:
            logger.info("No consent button found or not clickable")

        logger.info("Waiting for container to load...")
        try:
            container = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "div[role='feed']")))
            logger.info("Container loaded successfully")
        except TimeoutException:
            logger.error("Timeout waiting for container to load. Proceeding with available content.")
            container = driver.find_element(By.TAG_NAME, "body")

        # Scroll the container
        logger.info("Starting to scroll the container")
        last_height = driver.execute_script("return arguments[0].scrollHeight", container)
        scroll_count = 0
        while True:
            driver.execute_script("arguments[0].scrollTo(0, arguments[0].scrollHeight);", container)
            scroll_count += 1
            logger.info(f"Scroll attempt {scroll_count}")
            time.sleep(2)
            new_height = driver.execute_script("return arguments[0].scrollHeight", container)
            if new_height == last_height:
                logger.info("Reached the end of scrollable content")
                break
            last_height = new_height
        logger.info(f"Finished scrolling after {scroll_count} attempts")

        # Find all restaurant elements
        logger.info("Finding restaurant elements")
        restaurant_elements = container.find_elements(By.CSS_SELECTOR, "div[role='article']")
        logger.info(f"Found {len(restaurant_elements)} restaurant elements")

        restaurants = []
        for index, element in enumerate(restaurant_elements, 1):
            try:
                logger.info(f"Processing restaurant {index}")
                name = element.find_element(By.CSS_SELECTOR, "div.fontHeadlineSmall").text
                rating = element.find_element(By.CSS_SELECTOR, "span.MW4etd").text
                reviews = element.find_element(By.CSS_SELECTOR, "span.UY7F9").text
                details = element.find_element(By.CSS_SELECTOR, "div.W4Efsd:nth-child(2)").text
                restaurants.append({
                    "name": name,
                    "rating": rating,
                    "reviews": reviews,
                    "details": details
                })
                logger.info(f"Successfully processed restaurant: {name}")
            except Exception as e:
                logger.error(f"Error processing restaurant {index}: {str(e)}")
                continue

        logger.info(f"Successfully scraped {len(restaurants)} restaurants")
        return restaurants

    except Exception as e:
        logger.error(f"An error occurred during scraping: {str(e)}")
        return []

    finally:
        logger.info("Closing the driver")
        driver.quit()

if __name__ == "__main__":
    google_maps_url = "https://www.google.com/maps/search/japanese+restaurants"
    logger.info("Starting the scraping process")
    scraped_restaurants = scrape_google_maps_list(google_maps_url)
    logger.info("Scraping process completed")
    print(json.dumps(scraped_restaurants, indent=2))
    logger.info("Results printed")


