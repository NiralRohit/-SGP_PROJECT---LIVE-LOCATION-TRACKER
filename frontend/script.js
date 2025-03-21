// DOM Elements
const latitudeElement = document.getElementById('latitude');
const longitudeElement = document.getElementById('longitude');
const lastUpdatedElement = document.getElementById('last-updated');
const accuracyElement = document.getElementById('accuracy');
const statusIndicator = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');
const startTrackingBtn = document.getElementById('start-tracking-btn');
const stopTrackingBtn = document.getElementById('stop-tracking-btn');
const centerMapBtn = document.getElementById('center-map-btn');
const logoutBtn = document.getElementById('logout-btn');
const errorElement = document.getElementById('error-message');
const historyList = document.getElementById('history-list');

// App State
let isTracking = false;
let watchId = null;
let locationUpdateInterval = null;
const UPDATE_INTERVAL = 3000; // 3 seconds (more frequent updates)
let currentPosition = null;
let retryCount = 0;
const MAX_RETRIES = 3;
let mapRetryInterval = null;
let lastSavedPosition = null;
let locationsSaved = 0; // Counter for saved locations

// Simplify base API URL detection
const getBaseApiUrl = () => {
  return window.location.origin;
};

const API_BASE_URL = getBaseApiUrl();

// Check if user is logged in
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login.html';
    }
    return token;
}

// Show error message
function showError(message) {
    console.error('Error:', message);
    errorElement.textContent = message;
    errorElement.classList.remove('hidden');
    setTimeout(() => {
        errorElement.classList.add('hidden');
    }, 5000);
}

// Format time
function formatTime(date) {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

// Check if the map is ready to be updated
function isMapReady() {
    return typeof updateMap === 'function' && typeof map !== 'undefined' && map !== null;
}

// Calculate distance between two coordinates in meters
function calculateDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
    
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
}

// Update UI with location data
function updateLocationUI(position) {
    const { latitude, longitude, accuracy } = position.coords;
    
    latitudeElement.textContent = latitude.toFixed(6);
    longitudeElement.textContent = longitude.toFixed(6);
    accuracyElement.textContent = `${accuracy.toFixed(0)} m`;
    lastUpdatedElement.textContent = formatTime(new Date());
    
    statusIndicator.classList.remove('offline');
    statusIndicator.classList.add('online');
    statusText.textContent = 'Online - Tracking';
    
    currentPosition = {
        latitude,
        longitude,
        accuracy,
        timestamp: new Date().toISOString()
    };
    
    // Check if this is a significant location change (> 5 meters or first position)
    let shouldSave = false;
    if (!lastSavedPosition) {
        shouldSave = true;
    } else {
        const distance = calculateDistance(
            lastSavedPosition.latitude, lastSavedPosition.longitude,
            latitude, longitude
        );
        shouldSave = distance > 5; // Save if moved more than 5 meters
    }
    
    // Update map if updateMap function exists
    if (isMapReady()) {
        try {
            console.log("Updating map with coordinates:", latitude, longitude, accuracy);
            updateMap(latitude, longitude, accuracy);
            
            // Reset retry count since we succeeded
            retryCount = 0;
            
            // Clear any retry intervals
            if (mapRetryInterval) {
                clearInterval(mapRetryInterval);
                mapRetryInterval = null;
            }
        } catch (error) {
            console.error("Error updating map:", error);
            handleMapUpdateError();
        }
    } else {
        console.warn("Map update function not found or map not initialized yet. Attempting to initialize...");
        handleMapUpdateError();
    }
    
    // Save significant location changes
    if (shouldSave) {
        saveLocation(position);
        lastSavedPosition = { latitude, longitude, accuracy };
    }
}

// Handle errors when updating the map
function handleMapUpdateError() {
    retryCount++;
    
    // Only show an error message after multiple failures
    if (retryCount >= MAX_RETRIES) {
        showError("Map failed to update. Showing fallback location display.");
        
        // Try to display fallback map if coordinates are available
        if (currentPosition && typeof showFallbackMap === 'function') {
            showFallbackMap(currentPosition.latitude, currentPosition.longitude);
        }
        
        // Clear retry interval if it exists
        if (mapRetryInterval) {
            clearInterval(mapRetryInterval);
            mapRetryInterval = null;
        }
    } else if (!mapRetryInterval) {
        // Set up retry interval to reinitialize the map
        mapRetryInterval = setInterval(() => {
            if (typeof initMap === 'function') {
                try {
                    console.log(`Attempting to reinitialize map (attempt ${retryCount})...`);
                    initMap();
                    
                    // Update map immediately if we have a position
                    if (currentPosition && isMapReady()) {
                        updateMap(currentPosition.latitude, currentPosition.longitude, currentPosition.accuracy);
                        
                        // Clear interval on success
                        clearInterval(mapRetryInterval);
                        mapRetryInterval = null;
                    }
                } catch (error) {
                    console.error("Failed to reinitialize map:", error);
                }
            }
        }, 3000); // Try every 3 seconds
    }
}

// Save location to server
async function saveLocation(position) {
    try {
        const token = checkAuth();
        const { latitude, longitude, accuracy } = position.coords;
        
        console.log(`Saving location to server: ${latitude}, ${longitude}, accuracy: ${accuracy}m`);
        
        const response = await fetch(`${API_BASE_URL}/api/location`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                latitude,
                longitude,
                accuracy
            })
        });
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to save location');
        }
        
        console.log('Location saved successfully to server');
        locationsSaved++;
        
        // Add to history after successful save
        addLocationToHistory({
            latitude,
            longitude,
            accuracy,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error saving location:', error);
        // Don't show error to user for every failed location save
    }
}

// Start tracking location
function startTracking() {
    if (!navigator.geolocation) {
        showError('Geolocation is not supported by your browser');
        return;
    }
    
    startTrackingBtn.disabled = true;
    stopTrackingBtn.disabled = false;
    centerMapBtn.disabled = false;
    
    try {
        // Get initial position with high accuracy
        navigator.geolocation.getCurrentPosition(
            (position) => {
                console.log("Initial position obtained:", position.coords);
                updateLocationUI(position);
            },
            (error) => {
                handleGeolocationError(error);
            },
            { 
                enableHighAccuracy: true, 
                timeout: 15000,  // Increased timeout for initial position 
                maximumAge: 0 
            }
        );
        
        // Start watching position
        watchId = navigator.geolocation.watchPosition(
            (position) => {
                console.log("Position updated:", position.coords);
                updateLocationUI(position);
            },
            (error) => {
                handleGeolocationError(error);
            },
            { 
                enableHighAccuracy: true, 
                timeout: 10000, 
                maximumAge: 0 
            }
        );
        
        // Set interval to save location every 5 seconds
        locationUpdateInterval = setInterval(() => {
            if (currentPosition) {
                // Only save periodically if we haven't saved in a while
                const timeSinceLastSave = lastSavedPosition ? 
                    (new Date() - new Date(lastSavedPosition.timestamp)) : 
                    UPDATE_INTERVAL * 2;
                    
                if (timeSinceLastSave > UPDATE_INTERVAL * 3) { // Save if more than 3 intervals passed
                    saveLocation({ coords: currentPosition });
                }
            }
        }, UPDATE_INTERVAL);
        
        isTracking = true;
        console.log("Location tracking started successfully");
    } catch (error) {
        console.error("Failed to start location tracking:", error);
        showError('Failed to start location tracking: ' + error.message);
        stopTracking();
    }
}

// Stop tracking location
function stopTracking() {
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }
    
    if (locationUpdateInterval !== null) {
        clearInterval(locationUpdateInterval);
        locationUpdateInterval = null;
    }
    
    startTrackingBtn.disabled = false;
    stopTrackingBtn.disabled = true;
    
    statusIndicator.classList.remove('online');
    statusIndicator.classList.add('offline');
    statusText.textContent = 'Offline - Not Tracking';
    
    isTracking = false;
    console.log("Location tracking stopped");
}

// Handle geolocation errors
function handleGeolocationError(error) {
    let errorMessage;
    
    switch (error.code) {
        case error.PERMISSION_DENIED:
            errorMessage = 'You denied the request for geolocation. Please enable location services in your browser settings and refresh the page.';
            break;
        case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable. Please check your device settings or try moving to a location with better GPS signal.';
            break;
        case error.TIMEOUT:
            errorMessage = 'The request to get user location timed out. Please try again or check your internet connection.';
            break;
        default:
            errorMessage = 'An unknown error occurred while tracking location. Please refresh the page and try again.';
            break;
    }
    
    console.error("Geolocation error:", error.code, error.message);
    showError(errorMessage);
    
    // Don't immediately stop tracking on timeout or position unavailable
    if (error.code === error.PERMISSION_DENIED) {
        stopTracking();
    }
}

// Format a nice time difference
function formatTimeDifference(timestamp) {
    const now = new Date();
    const then = new Date(timestamp);
    const diffSeconds = Math.floor((now - then) / 1000);
    
    if (diffSeconds < 60) {
        return `${diffSeconds} seconds ago`;
    } else if (diffSeconds < 3600) {
        return `${Math.floor(diffSeconds / 60)} minutes ago`;
    } else if (diffSeconds < 86400) {
        return `${Math.floor(diffSeconds / 3600)} hours ago`;
    } else {
        return formatTime(then);
    }
}

// Add location to history list
function addLocationToHistory(position) {
    const { latitude, longitude, accuracy, timestamp } = position;
    const date = new Date(timestamp);
    const timeString = formatTime(date);
    const relativeTime = formatTimeDifference(timestamp);
    
    // Remove empty history message if present
    const emptyHistoryMsg = historyList.querySelector('.empty-history');
    if (emptyHistoryMsg) {
        historyList.removeChild(emptyHistoryMsg);
    }
    
    // Create new history item
    const historyItem = document.createElement('div');
    historyItem.classList.add('history-item');
    historyItem.innerHTML = `
        <span class="history-time"><i class="fas fa-clock"></i> ${relativeTime}</span>
        <span class="history-coords">
            <i class="fas fa-map-marker-alt"></i> Lat: ${latitude.toFixed(6)}, Lon: ${longitude.toFixed(6)}
        </span>
        <span class="history-accuracy"><i class="fas fa-crosshairs"></i> Accuracy: ${accuracy ? accuracy.toFixed(0) : '?'} m</span>
        <button class="btn-show-on-map" data-lat="${latitude}" data-lon="${longitude}">
            <i class="fas fa-eye"></i>
        </button>
    `;
    
    // Add to list (at the beginning)
    historyList.insertBefore(historyItem, historyList.firstChild);
    
    // Add event listener to show on map button
    const showOnMapBtn = historyItem.querySelector('.btn-show-on-map');
    showOnMapBtn.addEventListener('click', () => {
        const lat = parseFloat(showOnMapBtn.dataset.lat);
        const lon = parseFloat(showOnMapBtn.dataset.lon);
        
        if (isMapReady() && map) {
            map.setView([lat, lon], 16);
            marker.setLatLng([lat, lon]);
            marker.bindPopup(`<b>Recorded Location</b><br>Lat: ${lat.toFixed(6)}<br>Lon: ${lon.toFixed(6)}<br>Time: ${timeString}`).openPopup();
        }
    });
    
    // Limit history items to 20
    const historyItems = historyList.querySelectorAll('.history-item');
    if (historyItems.length > 20) {
        historyList.removeChild(historyItems[historyItems.length - 1]);
    }
}

// Fetch location history from server
async function fetchLocationHistory() {
    try {
        const token = checkAuth();
        
        const response = await fetch(`${API_BASE_URL}/api/locations?limit=20`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to fetch location history');
        }
        
        const data = await response.json();
        
        if (data.locations && data.locations.length > 0) {
            // Clear history list
            historyList.innerHTML = '';
            
            // Add each location to history list
            data.locations.forEach(location => {
                addLocationToHistory({
                    latitude: location.latitude,
                    longitude: location.longitude,
                    accuracy: location.accuracy || 0,
                    timestamp: location.timestamp
                });
            });
        }
        
    } catch (error) {
        console.error('Error fetching location history:', error);
        // Don't show error to user
    }
}

// Check server connection
async function checkServerConnection() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/health`);
        if (response.ok) {
            const data = await response.json();
            console.log("Server health check:", data);
            return true;
        }
        return false;
    } catch (error) {
        console.error("Server connection error:", error);
        return false;
    }
}

// Logout function
function logout() {
    // Stop tracking if active
    if (isTracking) {
        stopTracking();
    }
    
    // Clear token
    localStorage.removeItem('token');
    
    // Redirect to login page
    window.location.href = '/login.html';
}

// Event Listeners
document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    checkAuth();
    
    // Check server connection
    const serverConnected = await checkServerConnection();
    if (!serverConnected) {
        showError("Warning: Cannot connect to the server. Location tracking will work but data won't be saved.");
    }
    
    // Fetch location history
    fetchLocationHistory();
    
    // Add event listeners
    startTrackingBtn.addEventListener('click', startTracking);
    stopTrackingBtn.addEventListener('click', stopTracking);
    logoutBtn.addEventListener('click', logout);
    
    // Start tracking automatically
    setTimeout(() => {
        if (!isTracking) {
            console.log("Starting location tracking automatically...");
            startTracking();
        }
    }, 1000);
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        // Page is now visible to the user
        console.log("Page visible, checking tracking status");
        if (isTracking && watchId === null) {
            // Restart tracking if it was running before
            console.log("Restarting tracking after page became visible");
            startTracking();
        }
    }
});

// Connection status monitoring
window.addEventListener('online', () => {
    console.log("Internet connection restored");
    checkServerConnection();
    if (!isTracking) {
        startTracking();
    }
});

window.addEventListener('offline', () => {
    console.log("Internet connection lost");
    // We can still track locally even when offline
    showError('Internet connection lost. Location tracking continues but data is not being saved to the server.');
});
