
export const mapCountryCodeToApiRegion = (countryCode) => {
  if (!countryCode) return null;
  const upperCountryCode = countryCode.toUpperCase();
  if (['US', 'CA', 'MX', 'BR'].includes(upperCountryCode)) return 'NA';
  if (['GB', 'UK', 'FR', 'DE', 'IT', 'ES', 'NL', 'SE', 'PL', 'BE', 'TR', 'EG', 'AE', 'SA', 'IN'].includes(upperCountryCode)) return 'EU';
  if (['JP', 'AU', 'SG'].includes(upperCountryCode)) return 'FE';
  return null; 
};

export const pageStatusMap = {
  PROCESSING_INITIAL_TOKEN: 'processing_initial_token',
  SELECTING_PROFILES: 'selecting_profiles',
  PROCESSING_FINAL_LINK: 'processing_final_link',
  SUCCESS: 'success',
  ERROR: 'error',
  INFO: 'info',
};

export const DETAILED_BROWSER_STORAGE_ERROR_MSG = `Browser Storage Error: Security token not found after redirect. This often happens if:
1. You opened the Amazon authorization link in a new tab/window.
2. Your browser session expired due to inactivity.
3. Browser settings (e.g., Brave Shields, Safari ITP, Firefox Enhanced Tracking Protection) or extensions (ad-blockers, privacy tools) are restricting storage.
4. You are using Incognito/Private browsing mode.
Please try linking again, ensuring you:
- Complete the process in the SAME browser tab.
- Avoid using browser back/forward buttons during linking.
- Temporarily adjust browser privacy settings or disable problematic extensions for this site.
- Avoid Incognito/Private mode for linking.
If the issue persists, try a different browser or contact support.`;

export const clearCsrfAndRelinkInfo = () => {
  try {
    sessionStorage.removeItem('amazon_oauth_csrf_token');
    localStorage.removeItem('amazon_oauth_csrf_token');
    sessionStorage.removeItem('amazon_relink_info');
    localStorage.removeItem('amazon_relink_info');
    console.log("[CallbackUtils] Cleared CSRF tokens and relink info from sessionStorage and localStorage.");
  } catch (e) {
    console.warn("[CallbackUtils] Failed to clear CSRF tokens/relink info from storage:", e);
  }
};
