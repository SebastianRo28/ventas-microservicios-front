/**
 * Production build (`ng build`). The API is expected under the same domain as the web app, at /api (the reverse proxy
 * forwards /api to the API), so no CORS is needed. If the API lives on another domain, put its full https URL here.
 */
export const environment = {
  production: true,
  apiUrl: '/api',
};
