# Troubleshooting Live Location Tracking

This guide will help you troubleshoot common issues with the live location tracking feature.

## Common Issues

### "My location is not showing on the map"

1. **Check browser location permissions**
   - Make sure you've allowed location access in your browser.
   - Look for the location icon in your browser's address bar.
   - If you accidentally denied permission, you'll need to reset it in your browser settings.

2. **Check if tracking is enabled**
   - The "Start Tracking" button should be disabled and the status should say "Online - Tracking".
   - If not, click the "Start Tracking" button.

3. **Check internet connection**
   - The map tiles require an internet connection to load.
   - The fallback display will show your coordinates even without internet.

4. **Check browser console for errors**
   - Press F12 to open developer tools.
   - Look for errors related to geolocation or map loading.

5. **Try the "Retry Map" button**
   - If you see a fallback display with a "Retry Map" button, click it to attempt to reload the map.

### "The tracking is showing as offline"

1. **Check if the server is running**
   - The server must be running for the tracking to work.
   - Run `npm start` in the project directory to start the server.

2. **Check if MongoDB is running**
   - MongoDB is required for storing location history.
   - Run `mongod` in a separate terminal to start MongoDB.

3. **Try logging out and back in**
   - Sometimes the authentication token may expire.
   - Log out and log back in to get a fresh token.

### "I'm seeing a 'Positioning service failed' error"

1. **Check device GPS**
   - Make sure your device's GPS is enabled.
   - On mobile devices, ensure location services are enabled.
   - Try moving to an area with better GPS signal.

2. **Try a different browser**
   - Some browsers have better geolocation support than others.
   - Chrome and Firefox generally have the best support.

## Server Issues

### "Server won't start"

1. **Port conflict**
   - Another application might be using port 7890.
   - The server will automatically try the next port (7891, 7892, etc.).
   - Check the console output for the actual port being used.

2. **MongoDB connection error**
   - Ensure MongoDB is running.
   - Run `mongod` in a separate terminal.
   - The location tracking will work even without MongoDB, but locations won't be saved.

## Advanced Troubleshooting

### Clearing Browser Cache and Data

Sometimes cached data can cause issues. Here's how to clear it:

1. Chrome:
   - Open Chrome Settings > Privacy and Security > Clear browsing data
   - Select "Cookies and site data" and "Cached images and files"
   - Click "Clear data"

2. Firefox:
   - Open Firefox Options > Privacy & Security > Cookies and Site Data > Clear Data
   - Select "Cookies and Site Data" and "Cached Web Content"
   - Click "Clear"

### Testing with Debug Tool

The application includes a debug tool to help diagnose issues:

1. Navigate to `/debug.html` in your browser
2. The debug tool will display:
   - Server connection status
   - Geolocation permissions
   - API request results
   - Current user token validity

### Manual Location Testing

If you want to test the location tracking without changing your physical location:

1. In Chrome, open Developer Tools (F12)
2. Click the three-dot menu in the top-right corner
3. Go to More tools > Sensors
4. Under "Geolocation", select "Custom location"
5. Enter latitude and longitude values to simulate
6. The map should update with this new location

## Still Having Issues?

If you've tried all the above steps and are still having issues:

1. Check the server logs for detailed error messages
2. Try accessing the application from a different device
3. Ensure there are no network restrictions or firewalls blocking location services
4. If you suspect it's a code issue, check the GitHub repository for recent updates or known issues 