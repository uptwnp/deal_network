# Offline Logout Fix

## Problem
The application was logging users out whenever they lost internet connection. This happened even though their authentication token was still valid.

## Root Cause
The issue was caused by improper error handling in the API layer:

1. **Axios Interceptor** (`src/services/api.ts`):
   - The global axios error interceptor was catching ALL errors, including network errors
   - It treated network connectivity issues (offline, timeout) the same as authentication errors
   - This triggered `handleAuthError()` which logged users out even for temporary network issues

2. **AuthContext** (`src/contexts/AuthContext.tsx`):
   - On app startup, it tried to verify the user's token by calling `authApi.getProfile()`
   - When offline, this API call failed with a network error
   - The error handler didn't distinguish between network errors and auth errors
   - It would sometimes clear the user session even for network failures

## Solution
Three key improvements were made:

### 1. Fixed Axios Interceptor (`src/services/api.ts`)
**Before:** Logged out users for any error including network issues
**After:** Only logs out for explicit authentication errors (401, 403, or auth-specific error messages)

```typescript
// Now properly distinguishes between error types:
if (error.response) {
  // Server responded - check if it's an auth error (401/403)
  if (statusCode === 401 || statusCode === 403) {
    handleAuthError(); // Only logout for auth errors
  }
} else if (error.request) {
  // No response - network error (offline, timeout)
  // DO NOT logout - just log warning
  console.warn('Network error detected (offline or timeout)');
}
```

### 2. Improved AuthContext Token Verification (`src/contexts/AuthContext.tsx`)
**Before:** Any error during token verification would keep user logged in (commented as "potentially stale")
**After:** Explicitly checks if the error is a network error vs auth error

```typescript
catch (error: any) {
  const isNetworkError = error.code === 'ECONNABORTED' || 
                         error.code === 'ERR_NETWORK' ||
                         !error.response; // No response = network issue
  
  if (isNetworkError) {
    // Keep user logged in when offline
    console.warn('Network error - keeping user logged in');
  } else {
    // Actual auth error - logout
    authApi.logout();
  }
}
```

### 3. Enhanced Error Messages (`src/services/authApi.ts`)
**Before:** Generic error messages
**After:** Specific, helpful messages for different error types

```typescript
if (!error.response) {
  if (error.code === 'ECONNABORTED') {
    return { status: false, message: 'Request timeout. Please check your connection.' };
  } else if (error.code === 'ERR_NETWORK') {
    return { status: false, message: 'Network error. Please check your internet connection.' };
  }
}
```

## Behavior After Fix

### When Going Offline:
✅ **User stays logged in**
✅ Token remains valid in localStorage
✅ Clear warning messages in console
✅ Helpful error messages to user about connectivity

### When Token Actually Expires:
✅ Still logs out correctly (401/403 from server)
✅ Clears all auth data properly
✅ Redirects to login page

### When Back Online:
✅ User can continue using the app immediately
✅ No need to log in again
✅ Token gets re-verified automatically

## Error Codes Reference
- `ECONNABORTED`: Request timeout (slow/no internet)
- `ERR_NETWORK`: Network error (offline, DNS failure, etc.)
- `error.request` without `error.response`: Request sent but no response received
- `401`: Unauthorized (invalid/expired token)
- `403`: Forbidden (lack of permissions)

## Testing Recommendations
1. **Test Offline Behavior:**
   - Log in to the app
   - Disconnect from internet
   - Navigate around the app
   - Verify user stays logged in
   - Reconnect and verify everything still works

2. **Test Token Expiration:**
   - Manually expire the token (wait 30 days or modify expiry time)
   - Try to make an API call
   - Verify user gets logged out properly

3. **Test Intermittent Connectivity:**
   - Turn wifi on/off repeatedly while using the app
   - Verify smooth experience with appropriate error messages

## Files Modified
1. `/src/services/api.ts` - Fixed axios interceptor
2. `/src/contexts/AuthContext.tsx` - Improved token verification
3. `/src/services/authApi.ts` - Better error messages
