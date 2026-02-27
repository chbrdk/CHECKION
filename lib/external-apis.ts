/**
 * Central base URLs for external 3rd-party APIs.
 * Never hardcode API URLs in scanner or API routes.
 */

/** ip-api.com – Geo lookup by IP. Free for non-commercial. */
export const API_IP_API_BASE = 'http://ip-api.com';

/** SSL Labs API – SSL/TLS grade, certificates. Free with rate limits. */
export const API_SSL_LABS_BASE = 'https://api.ssllabs.com/api/v3';

/** Google PageSpeed Insights v5. Free (API key recommended for production). */
export const API_PAGESPEED_BASE = 'https://pagespeedonline.googleapis.com/pagespeedonline/v5';

/** Wayback Machine – Domain availability/history. Free. */
export const API_WAYBACK_AVAILABLE = 'https://archive.org/wayback/available';
