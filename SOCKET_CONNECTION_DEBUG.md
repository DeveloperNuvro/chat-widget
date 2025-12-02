# Socket Connection Debugging Guide

## Issue
Chat widget header shows "Connecting..." instead of "Online"

## Debugging Steps Added

### 1. Enhanced Logging in ChatInbox.tsx
- Socket initialization logs with URL
- Connection state changes
- Error details with full error objects
- State change tracking

### 2. Enhanced Logging in Header.tsx
- Prop value changes
- Connection status calculations
- What text will be displayed

### 3. URL Resolution
- Checks `baseURL` from axios config
- Falls back to `VITE_API_BASE_URL` env variable
- Final fallback to `http://localhost:7575`

## How to Debug

### Step 1: Open Browser Console
1. Open the chat widget
2. Open browser DevTools (F12)
3. Go to Console tab

### Step 2: Look for These Logs

#### On Widget Load:
```
[Chat Widget] ========== SOCKET INITIALIZATION ==========
[Chat Widget] API_BASE_URL: http://localhost:7575
[Chat Widget] baseURL from axios: undefined (or actual value)
[Chat Widget] VITE_API_BASE_URL: undefined (or actual value)
[Chat Widget] Socket instance created: (socket ID or 'no ID yet')
[Chat Widget] Socket connected state: false
```

#### On Connection Success:
```
[Chat Widget] ✅✅✅ Socket connected successfully! ID: (socket ID)
[Chat Widget] Setting socketConnected to TRUE
[Chat Widget] 🔄 socketConnected state changed to: true
[Header] 🔄 socketConnected prop changed to: true
[Header] Connection status calculated: online
[Header] Will show: Online
```

#### On Connection Error:
```
[Chat Widget] ❌❌❌ Socket connection error: (error details)
[Chat Widget] Error message: (error message)
[Chat Widget] Error type: (error type)
[Chat Widget] Connection URL: (URL)
[Chat Widget] Setting socketConnected to FALSE
```

### Step 3: Check Network Tab
1. Go to Network tab in DevTools
2. Filter by "WS" (WebSocket) or "socket.io"
3. Look for connection attempts
4. Check if connection is:
   - Pending (not connecting)
   - Failed (red, check error)
   - Connected (green, should see upgrade to WebSocket)

### Step 4: Common Issues

#### Issue 1: Wrong URL
**Symptom:** Connection error with wrong URL in logs
**Fix:** Set `VITE_API_BASE_URL` environment variable to `http://localhost:7575`

#### Issue 2: CORS Error
**Symptom:** Connection error mentioning CORS
**Fix:** Ensure `http://localhost:5174` is in allowed origins (it should be)

#### Issue 3: Socket Never Connects
**Symptom:** No connect event, no errors
**Possible Causes:**
- Backend not running
- Wrong port
- Firewall blocking connection
- Network issues

#### Issue 4: State Not Updating
**Symptom:** Socket connects but header still shows "Connecting..."
**Check:**
- Look for `[Chat Widget] 🔄 socketConnected state changed to: true`
- Look for `[Header] 🔄 socketConnected prop changed to: true`
- If these don't appear, there's a state update issue

## Quick Test

Add this to browser console after widget loads:
```javascript
// Check socket state
window.__socketDebug = () => {
  const iframe = document.getElementById('ai-chat-widget-frame');
  if (iframe && iframe.contentWindow) {
    console.log('Socket in iframe:', iframe.contentWindow);
  }
};
```

## Expected Behavior

1. Widget opens → Socket initializes immediately
2. Within 1-2 seconds → Socket connects
3. Header updates → Shows "Online" instead of "Connecting..."
4. Green dot appears → Connection indicator turns green

## Files Modified

1. `/chat-widget/src/component/ChatInbox.tsx`
   - Enhanced socket initialization
   - Better URL resolution
   - Comprehensive logging
   - State change tracking

2. `/chat-widget/src/component/Header.tsx`
   - Fixed default prop value (false instead of true)
   - Added prop change logging
   - Connection status logging

## Next Steps

1. Check browser console for the logs above
2. Share the console output to identify the exact issue
3. Verify backend is running on port 7575
4. Check if socket.io server is accepting connections

