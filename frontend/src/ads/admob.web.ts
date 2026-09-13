// Web / preview: ads are native-only, so everything is a no-op here.
export async function initializeAds() {}
export function preloadInterstitial() {}
export function showPreloadedInterstitial(): boolean {
  return false;
}
