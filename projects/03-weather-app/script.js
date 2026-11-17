"use strict"

const UI = {
    search: document.getElementById("search"),
    searchBtn: document.getElementById("search-btn"),
    useCairoBtn: document.getElementById("use-cairo-btn"),
    loading: document.getElementById("loading"),
    results: document.getElementById("results"),
    city: document.getElementById("city"),
    cityMeta: document.getElementById("city-meta"),
    temperature: document.getElementById("temperature"),
    humidity: document.getElementById("humidity"),
    wind: document.getElementById("wind"),
    localTime: document.getElementById("local-time"),
    forecastRowsContainer: document.getElementById("forecast-rows-container"),
    error: document.getElementById("error")
}

let currentControler;
let canSearch = true;
let lastSearch;

const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FC_URL = "https://api.open-meteo.com/v1/forecast";


function setLoading(isLoading){
    UI.loading.style.display = isLoading ? "block" : "none";
    UI.searchBtn.disabled = isLoading;
    UI.searchBtn.classList.toggle("disabled", isLoading);
    UI.useCairoBtn.disabled = isLoading;
    UI.useCairoBtn.classList.toggle("disabled", isLoading);
    canSearch = !isLoading;
}

function setError(message){
    UI.error.style.display = message ? "block" : "none";
    UI.error.textContent = message;
}


// Fetch a result from an API(With signal, so we can abort the request), and return it as Json.
async function apiFetchJson(url, signal){
    const res = await fetch(url, {signal});
    if (!res.ok) throw new Error(`HTTP ${res.status} (${res.statusText})`);
    return res.json();
}

// Fetch and return the latitude and longitude of a city, that allows us to get the rest of data from FC_URL.
async function getGeoCodeCity(name, signal){
    let url = new URL(GEO_URL);

    url.searchParams.set("name", name);
    url.searchParams.set("count", "1");
    url.searchParams.set("language", "en");
    url.searchParams.set("format", "json");

    const data = await apiFetchJson(url, signal);
    if (!data.results || data.results.length === 0) throw new Error(`City not found: ${name}`);
    return data.results[0];
}

// Fetch and return the forecast data by latitude and longitude of a city.
async function getForecast(lat, lon, signal){
    let url = new URL(FC_URL);

    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lon));

    url.searchParams.set(
        "current",
        "temperature_2m,relative_humidity_2m,wind_speed_10m"
    );

    url.searchParams.set(
        "daily",
        "temperature_2m_min,temperature_2m_max,precipitation_sum"
    );

    url.searchParams.set("timezone", "auto");

    return apiFetchJson(url, signal);
}


function render(place, data){
    UI.results.style.display = "flex";
    UI.city.textContent = `${place.name}, ${place.country}`;
    UI.cityMeta.textContent = `Lat/Lon: ${place.latitude}, ${place.longitude}`;

    const t = data.current.temperature_2m;
    const tUnit = data.current_units.temperature_2m;
    UI.temperature.textContent = `${t}${tUnit}`;

    UI.humidity.textContent = `Humidity: ${data.current.relative_humidity_2m}${data.current_units.relative_humidity_2m}`;
    UI.wind.textContent = `Wind: ${data.current.wind_speed_10m} ${data.current_units.wind_speed_10m}`;
    UI.localTime.textContent = `Local time: ${data.current.time} (${data.timezone})`;

    const days = data.daily.time;

    UI.forecastRowsContainer.innerHTML = days.map((day, i) => {
        const min = data.daily.temperature_2m_min[i];
        const max = data.daily.temperature_2m_max[i];
        const rain = data.daily.precipitation_sum[i];

        const minU = data.daily_units.temperature_2m_min;
        const maxU = data.daily_units.temperature_2m_max;
        const rainU = data.daily_units.precipitation_sum;

        return `
        <tr>
            <td>${day}</td>
            <td>${min}${minU}</td>
            <td>${max}${maxU}</td>
            <td>${rain} ${rainU}</td>
        </tr>`;
    }).join("");
}


async function runSearch(city){
    if (!canSearch) return;

    if (city === lastSearch) return;
    lastSearch = city;

    if (currentControler) currentControler.abort();
    currentControler = new AbortController();

    setError("");
    setLoading(true);

    try {
        const place = await getGeoCodeCity(city, currentControler.signal);
        const data = await getForecast(place.latitude, place.longitude, currentControler.signal);
        render(place, data);
    } catch (error) {
        if (error.name === "AbortError") return;
        setError(`${error.message}`);
        UI.results.style.display = "none";
        lastSearch = "";
    } finally {
        setLoading(false);
    }
}


// Add event listeners
UI.searchBtn.addEventListener("click", (e) => {
    const name = UI.search.value.trim();

    if (!name) {setError("Please type a city name"); return;}

    runSearch(name);
});

UI.useCairoBtn.addEventListener("click", (e) => {
    UI.search.value = "Cairo";
    runSearch("Cairo");
});

UI.search.addEventListener("keydown", (e) => {
    if (e.key === "Enter") UI.searchBtn.click();
})


// Start
UI.search.value = "Cairo";
runSearch("Cairo");