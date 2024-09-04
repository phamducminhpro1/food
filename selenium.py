from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
import time

def scrape_google_maps_list(url):
    # Set up Chrome options
    chrome_options = Options()
    chrome_options.add_argument("--headless")  # Run in headless mode

    # Set up the driver
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)

    # Navigate to the URL
    driver.get(url)

    # Wait for the list to load
    wait = WebDriverWait(driver, 10)
    wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "div[role='feed']")))

    # Scroll to load all items
    last_height = driver.execute_script("return document.body.scrollHeight")
    while True:
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(2)
        new_height = driver.execute_script("return document.body.scrollHeight")
        if new_height == last_height:
            break
        last_height = new_height

    # Find all restaurant elements
    restaurant_elements = driver.find_elements(By.CSS_SELECTOR, "div[role='feed'] > div")

    restaurants = []
    for element in restaurant_elements:
        try:
            name = element.find_element(By.CSS_SELECTOR, "div.fontHeadlineSmall").text
            location_element = element.find_element(By.CSS_SELECTOR, "div.fontBodyMedium span:nth-child(2)")
            location = location_element.text if location_element else "Location not found"
            restaurants.append({"name": name, "location": location})
        except Exception as e:
            print(f"Error processing element: {e}")
            continue

    # Close the driver
    driver.quit()

    return restaurants

# Example usage
google_maps_url = "https://www.google.com/maps/@27.4159078,-73.6170366,3z/data=!4m3!11m2!2smbYUqCVqvg0IlPZuGmIQNsGvNDQsQw!3e3?entry=ttu&g_ep=EgoyMDI0MDgyOC4wIKXMDSoASAFQAw%3D%3D"
scraped_restaurants = scrape_google_maps_list(google_maps_url)
print(scraped_restaurants)