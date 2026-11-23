/**
 * Development: the Angular dev server forwards /api to the API (proxy.conf.json) keeping the original host, so the API
 * knows which tenant the request is for (comercialandina.localhost:4200 → tenant "comercialandina").
 */
export const environment = {
  production: false,
  apiUrl: '/api',
};
