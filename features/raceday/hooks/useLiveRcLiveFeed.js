import useLiveRcFeedLifecycle from './useLiveRcFeedLifecycle';

export default function useLiveRcLiveFeed(siteUrl = '', enabled = true) {
  return useLiveRcFeedLifecycle(siteUrl, enabled);
}

export { useLiveRcLiveFeed };
