import { useEffect } from 'react';
import notificationApiService from '../services/notificationApiService';

/**
 * Optional hook if you prefer colocating notification startup outside App.js.
 */
export function useNotificationBootstrap() {
  useEffect(() => {
    (async () => {
      await notificationApiService.initialize();
      await notificationApiService.registerPushToken();
    })();
  }, []);
}
