/**
 * parseUA — Parses a User-Agent string to extract OS, device type, and browser.
 * Used in auth (session tracking) and redirect (analytics logging).
 *
 * @param {string|undefined} userAgent
 * @returns {{ deviceType: string, os: string, browser: string }}
 */
function parseUA(userAgent) {
  if (!userAgent) {
    return { deviceType: 'other', os: 'unknown', browser: 'unknown' };
  }

  const ua = userAgent.toLowerCase();

  // OS Detection
  let os = 'unknown';
  if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) os = 'iOS';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('win')) os = 'Windows';
  else if (ua.includes('macintosh') || ua.includes('mac os')) os = 'macOS';
  else if (ua.includes('linux')) os = 'Linux';

  // Device Type Detection
  let deviceType = 'desktop';
  if (ua.includes('ipad') || ua.includes('tablet') || (ua.includes('android') && !ua.includes('mobi'))) {
    deviceType = 'tablet';
  } else if (ua.includes('mobi') || ua.includes('iphone') || ua.includes('ipod')) {
    deviceType = 'mobile';
  }

  // Browser Detection
  let browser = 'unknown';
  if (ua.includes('firefox')) browser = 'Firefox';
  else if (ua.includes('edge') || ua.includes('edg')) browser = 'Edge';
  else if (ua.includes('opera') || ua.includes('opr')) browser = 'Opera';
  else if (ua.includes('chrome') && !ua.includes('chromium')) browser = 'Chrome';
  else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';

  return { deviceType, os, browser };
}

module.exports = parseUA;
