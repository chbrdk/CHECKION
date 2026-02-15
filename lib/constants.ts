/**
 * Central place for app-wide paths and asset URLs.
 * Do not hardcode paths in components – reference these constants.
 */

/** Public path for the black MSQDX logo (PDF reports, print). Resolve with origin in browser: `${window.location.origin}${PDF_LOGO_PATH}` */
export const PDF_LOGO_PATH = '/msqdx-logo-black.svg';

/** Cookie and localStorage key for UI language (de/en). Used by lib/i18n. */
export const LOCALE_STORAGE_KEY = 'checkion_locale';
