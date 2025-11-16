// This script runs in every page before app scripts.
// Inject a default access token so the app treats the session as authenticated.
try {
  window.localStorage.setItem('accessToken', window.localStorage.getItem('accessToken') || 'mcp-token');
} catch (_) {
  // ignore storage errors
}

