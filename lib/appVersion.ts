import Constants from 'expo-constants';
import * as Updates from 'expo-updates';

// Version line for Settings. A phone running a downloaded (over-the-air) update also shows
// when that update was published, so it's easy to tell whether it has arrived.
export function appVersionLabel() {
  const version = `LED Pro · v${Constants.expoConfig?.version ?? ''}`;
  if (Updates.isEmbeddedLaunch || !Updates.createdAt) return version;
  const when = Updates.createdAt.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  return `${version} · update ${when}`;
}
