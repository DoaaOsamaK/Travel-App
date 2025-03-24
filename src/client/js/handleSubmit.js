const details = {};

// Define API endpoints (without hardcoding the keys)
const geoNamesURL = 'http://api.geonames.org/searchJSON?q=';
const weatherbitforecastURL = 'https://api.weatherbit.io/v2.0/forecast/daily?lat=';
const weatherbithistoryURL = 'https://api.weatherbit.io/v2.0/history/daily?lat=';
const pixabayURL = 'https://pixabay.com/api/?key=';

// DOM elements
const trip_details_section = document.getElementById('trip_details_section');
const plan_trip = document.getElementById('plan_trip');

// Store API keys
let apiKeys = {};

// Fetch API keys from the server
async function fetchAPIKeys() {
    try {
        const response = await fetch('/api/keys');
        if (!response.ok) throw new Error('Failed to fetch API keys');
        apiKeys = await response.json();
    } catch (error) {
        console.error('Error fetching API keys:', error);
    }
}

// Handle form submission
async function handleSubmit(e) {
    e.preventDefault(); // Prevent default behavior to stop page reload

    // Fetch API keys if not already fetched
    if (!apiKeys.geoNamesUsername) {
        await fetchAPIKeys();
    }

    // Getting elements value from DOM
    details['from'] = document.getElementById('from_place').value;
    details['to'] = document.getElementById('to_place').value;
    details['date'] = document.getElementById('travel_date').value;
    details['daystogo'] = date_diff_indays(details['date']);

    try {
        // Fetching geo stats of destination place.
        const toInfo = await getGeoDetails(details['to']);
        if (toInfo.geonames && toInfo.geonames.length > 0) {
            const toLat = toInfo.geonames?.[0]?.lat;
            const toLng = toInfo.geonames?.[0]?.lng;

            // Continue with weather API request
            const weatherData = await getWeatherData(toLat, toLng, details['date']);
            if (weatherData.data && weatherData.data.length > 0) {
                details['temperature'] = weatherData['data'][0]['temp'];
                details['weather_condition'] = weatherData['data'][0]['weather']['description'];
            } else {
                throw new Error('No weather data available for the provided coordinates and date');
            }

            // Continue with Pixabay API request
            const imageDetails = await getImage(details['to']);
            if (imageDetails.hits && imageDetails.hits.length > 0) {
                details['cityImage'] = imageDetails['hits'][0]['webformatURL'];
            } else {
                details['cityImage'] = 'default_image_url';  // Provide a default image if no image is found
            }

            // Send data to server
            const data = await postData(details);
            updateUI(data);
        } else {
            throw new Error('No results found for the destination in GeoNames API');
        }
    } catch (e) {
        console.log('error', e);
    }
}

// Function to get Geo stats
async function getGeoDetails(to) {
    const response = await fetch(geoNamesURL + to + '&maxRows=1&username=' + apiKeys.geoNamesUsername);
    try {
        return await response.json();
    } catch (e) {
        console.log('Error parsing JSON:', e);
    }
}

// Function to get weather data
async function getWeatherData(toLat, toLng, date) {
    const timestamp_trip_date = Math.floor(new Date(date).getTime() / 1000);
    const todayDate = new Date();
    const timestamp_today = Math.floor(new Date(todayDate.getFullYear() + '-' + todayDate.getMonth() + '-' + todayDate.getDate()).getTime() / 1000);

    let response;
    if (timestamp_trip_date < timestamp_today) {
        let next_date = new Date(date);
        next_date.setDate(next_date.getDate() + 1);
        response = await fetch(weatherbithistoryURL + toLat + '&lon=' + toLng + '&start_date=' + date + '&end_date=' + next_date + '&key=' + apiKeys.weatherbitKey);
    } else {
        response = await fetch(weatherbitforecastURL + toLat + '&lon=' + toLng + '&key=' + apiKeys.weatherbitKey);
    }

    try {
        return await response.json();
    } catch (e) {
        console.log('error', e)
    }
}

async function getImage(toCity) {
    const response = await fetch(pixabayURL + apiKeys.pixabayAPIKey + '&q=' + toCity + ' city&image_type=photo');
    try {
        return await response.json();
    } catch (e) {
        console.log('error', e);
    }
}

async function postData(details) {
    const response = await fetch('http://localhost:8089/postData', {
        method: "POST",
        credentials: 'same-origin',
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(details)
    });

    try {
        return await response.json();
    } catch (e) {
        console.log('error', e);
    }
}

// Updating the UI
function updateUI(data) {
    trip_details_section.classList.remove('invisible');
    trip_details_section.scrollIntoView({ behavior: "smooth" });
    let destination_details = document.getElementById("destination");
    let boarding_details = document.getElementById("boarding");
    let departure_date = document.getElementById("departing_date");
    let number_of_days = document.getElementById('number_of_days');
    let temperature = document.getElementById('temperature');
    let dest_desc_photo = document.getElementById('dest_desc_photo');
    let weather = document.getElementById('weather');

    destination_details.innerHTML = data.to;
    boarding_details.innerText = data.from;
    departure_date.innerHTML = data.date;

    if (data.daystogo < 0) {
        document.querySelector('#days_to_go_details').innerHTML = 'Seems like you have already been to the trip!';
    } else {
        number_of_days.innerHTML = data.daystogo;
    }
    temperature.innerHTML = data.temperature + '&#8451;';
    if (data.cityImage !== undefined) {
        dest_desc_photo.setAttribute('src', data.cityImage);
    }

    weather.innerHTML = data.weather_condition;
}

let date_diff_indays = function (date1) {
    let dt1 = new Date(date1);
    let dt2 = new Date();
    return Math.floor((Date.UTC(dt1.getFullYear(), dt1.getMonth(), dt1.getDate()) - Date.UTC(dt2.getFullYear(), dt2.getMonth(), dt2.getDate())) / (1000 * 60 * 60 * 24));
};

export {
    plan_trip,
    handleSubmit,
    trip_details_section
}
