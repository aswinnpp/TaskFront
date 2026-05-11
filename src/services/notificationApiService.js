import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { apiRequest } from '../config/api';

class NotificationApiService {
  async initialize() {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowList: true,
      }),
    });
  }

  async registerPushToken() {
    try {
      if (!Device.isDevice) {
        console.log('[NOTIFICATION]', 'Physical device required');
        return;
      }

      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();

      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } =
          await Notifications.requestPermissionsAsync();

        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('[NOTIFICATION]', 'Permission denied');
        return;
      }

      const token =
        (
          await Notifications.getExpoPushTokenAsync({
            projectId:
              Constants.expoConfig?.extra?.eas
                ?.projectId,
          })
        ).data;

      console.log('[EXPO PUSH TOKEN]', token);

      const deviceType =
        (Device.osName || '').toLowerCase().includes('android')
          ? 'android'
          : (Device.osName || '').toLowerCase().includes('ios')
            ? 'ios'
            : 'unknown';

      await apiRequest('/notifications/register-token', {
        method: 'POST',
        body: {
          pushToken: token,
          deviceType,
        },
      });

      console.log('[NOTIFICATION TOKEN REGISTERED]');
    } catch (error) {
      console.log(
        '[NOTIFICATION API ERROR]',
        error?.message || error
      );
    }
  }
}

export default new NotificationApiService();