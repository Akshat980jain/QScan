export const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://qscan-backend.onrender.com');

// The URL embedded in dynamic QR code pixels MUST always be the production backend,
// never localhost. Scanned QR codes need to resolve on any device, not just the dev machine.
export const PRODUCTION_API_URL = import.meta.env.VITE_PRODUCTION_API_URL || 'https://qscan-backend.onrender.com';
