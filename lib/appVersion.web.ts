import Constants from 'expo-constants';

// Web always runs the latest deploy, so there are no downloaded updates to show.
export function appVersionLabel() {
  return `LED Pro · v${Constants.expoConfig?.version ?? ''}`;
}
