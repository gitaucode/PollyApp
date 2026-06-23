import { useAuthActions } from '@/hooks/use-auth';
import { pollpopApi } from '@/lib/api';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

export function useUnreadActivityCount() {
  const { user } = useAuthActions();
  const userId = user?.id;
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!userId) {
      setCount(0);
      return;
    }
    try {
      const items = await pollpopApi.getActivity(userId);
      setCount(items.filter((item) => item.unread).length);
    } catch {
      setCount(0);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return count;
}
