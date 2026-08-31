import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '../supabase';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Register device for push notifications and save token
export async function registerForPushNotifications(userId) {
  if (Platform.OS === 'web') return null;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission denied');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync().catch(() => null);
    if (!tokenData) {
      console.log('Could not get push token - may need development build');
      return null;
    }

    const token = tokenData.data;

    if (userId && token) {
      await supabase
        .from('team_members')
        .update({ expo_push_token: token })
        .eq('id', userId);
    }

    return token;
  } catch (e) {
    console.log('Push notification setup skipped:', e);
    return null;
  }
}

// Send a push notification to a list of tokens
export async function sendPushNotification(tokens, title, body) {
  if (!tokens || tokens.length === 0) return;

  const messages = tokens.map(token => ({
    to: token,
    sound: 'default',
    title,
    body,
  }));

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });
  } catch (e) {
    console.log('Send notification error:', e);
  }
}

// Get all team members who want a specific notification type
export async function getNotificationRecipients(notificationType, excludeUserId = null) {
  const { data } = await supabase
    .from('team_members')
    .select('id, expo_push_token, notify_area_complete, notify_job_complete, notify_job_notes')
    .not('expo_push_token', 'is', null);

  if (!data) return [];

  return data
    .filter(m => m.id !== excludeUserId)
    .filter(m => m[notificationType] === true)
    .map(m => m.expo_push_token)
    .filter(Boolean);
}

// Notification helpers
export async function notifyAreaComplete(areaName, jobName, triggeredByUserId) {
  const tokens = await getNotificationRecipients('notify_area_complete', triggeredByUserId);
  await sendPushNotification(tokens, '✅ Area complete', `${areaName} marked complete in ${jobName}`);
}

export async function notifyJobComplete(jobName, triggeredByUserId) {
  const tokens = await getNotificationRecipients('notify_job_complete', triggeredByUserId);
  await sendPushNotification(tokens, '🎉 Job complete', `${jobName} has been fully completed`);
}

export async function notifyJobNote(jobName, triggeredByUserId) {
  const tokens = await getNotificationRecipients('notify_job_notes', triggeredByUserId);
  await sendPushNotification(tokens, '📝 New job note', `A note was added to ${jobName}`);
}

// Log a change to the change_log table
export async function logChange(areaId, jobId, userId, userName, changeType, description) {
  try {
    await supabase.from('change_log').insert({
      area_id: areaId,
      job_id: jobId,
      changed_by: userId,
      changed_by_name: userName,
      change_type: changeType,
      description,
    });
  } catch (e) {
    console.log('Change log error:', e);
  }
}