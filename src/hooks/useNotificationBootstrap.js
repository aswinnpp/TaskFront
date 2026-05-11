import { useEffect } from 'react';
import {
  notificationServiceInitialize,
  notificationServiceRegisterPushToken,
} from '@backend/services/notificationService';

/**
 * Optional hook if you prefer colocating notification startup outside App.js.
 */
export function useNotificationBootstrap() {
  useEffect(() => {
    (async () => {
      await notificationServiceInitialize();
      await notificationServiceRegisterPushToken();
    })();
  }, []);
}
