import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  AppNotification,
  deleteNotification,
  deleteAllNotifications,
  fetchUnreadNotificationCount,
  fetchUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notificationQueryKeys,
} from '@/lib/notifications';
import { GC_TIME, STALE_TIME } from '@/lib/queryConfig';

interface UseNotificationsOptions {
  includeList?: boolean;
}

export function useNotifications({ includeList = true }: UseNotificationsOptions = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const notificationsQuery = useQuery({
    queryKey: notificationQueryKeys.list(user?.id),
    queryFn: () => fetchUserNotifications(user!.id),
    enabled: includeList && !!user,
    staleTime: STALE_TIME.DYNAMIC,
    gcTime: GC_TIME.STANDARD,
    placeholderData: (previous) => previous,
  });

  const unreadCountQuery = useQuery({
    queryKey: notificationQueryKeys.unreadCount(user?.id),
    queryFn: () => fetchUnreadNotificationCount(user!.id),
    enabled: !!user,
    staleTime: STALE_TIME.SHORT,
    gcTime: GC_TIME.SHORT,
    placeholderData: (previous) => previous,
  });

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onMutate: async (notificationId) => {
      if (!user) return;

      await Promise.all([
        queryClient.cancelQueries({ queryKey: notificationQueryKeys.list(user.id) }),
        queryClient.cancelQueries({ queryKey: notificationQueryKeys.unreadCount(user.id) }),
      ]);

      const previousNotifications = queryClient.getQueryData<AppNotification[]>(
        notificationQueryKeys.list(user.id),
      );
      const previousUnreadCount = queryClient.getQueryData<number>(
        notificationQueryKeys.unreadCount(user.id),
      );

      if (previousNotifications) {
        const updatedNotifications = previousNotifications.map((notification) =>
          notification.id === notificationId ? { ...notification, read: true } : notification,
        );
        queryClient.setQueryData(notificationQueryKeys.list(user.id), updatedNotifications);

        if (typeof previousUnreadCount === 'number') {
          const notificationWasUnread = previousNotifications.some(
            (notification) => notification.id === notificationId && !notification.read,
          );
          if (notificationWasUnread) {
            queryClient.setQueryData(
              notificationQueryKeys.unreadCount(user.id),
              Math.max(0, previousUnreadCount - 1),
            );
          }
        }
      }

      return { previousNotifications, previousUnreadCount };
    },
    onError: (_error, _notificationId, context) => {
      if (!user || !context) return;

      if (context.previousNotifications) {
        queryClient.setQueryData(notificationQueryKeys.list(user.id), context.previousNotifications);
      }

      if (typeof context.previousUnreadCount === 'number') {
        queryClient.setQueryData(
          notificationQueryKeys.unreadCount(user.id),
          context.previousUnreadCount,
        );
      }
    },
    onSettled: () => {
      if (!user) return;
      queryClient.invalidateQueries({ queryKey: notificationQueryKeys.list(user.id) });
      queryClient.invalidateQueries({ queryKey: notificationQueryKeys.unreadCount(user.id) });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => markAllNotificationsRead(user!.id),
    onMutate: async () => {
      if (!user) return;

      await Promise.all([
        queryClient.cancelQueries({ queryKey: notificationQueryKeys.list(user.id) }),
        queryClient.cancelQueries({ queryKey: notificationQueryKeys.unreadCount(user.id) }),
      ]);

      const previousNotifications = queryClient.getQueryData<AppNotification[]>(
        notificationQueryKeys.list(user.id),
      );
      const previousUnreadCount = queryClient.getQueryData<number>(
        notificationQueryKeys.unreadCount(user.id),
      );

      if (previousNotifications) {
        queryClient.setQueryData(
          notificationQueryKeys.list(user.id),
          previousNotifications.map((notification) => ({ ...notification, read: true })),
        );
      }

      queryClient.setQueryData(notificationQueryKeys.unreadCount(user.id), 0);

      return { previousNotifications, previousUnreadCount };
    },
    onError: (_error, _variables, context) => {
      if (!user || !context) return;

      if (context.previousNotifications) {
        queryClient.setQueryData(notificationQueryKeys.list(user.id), context.previousNotifications);
      }

      if (typeof context.previousUnreadCount === 'number') {
        queryClient.setQueryData(
          notificationQueryKeys.unreadCount(user.id),
          context.previousUnreadCount,
        );
      }
    },
    onSettled: () => {
      if (!user) return;
      queryClient.invalidateQueries({ queryKey: notificationQueryKeys.list(user.id) });
      queryClient.invalidateQueries({ queryKey: notificationQueryKeys.unreadCount(user.id) });
    },
  });

  // ── Delete single notification ──
  const deleteMutation = useMutation({
    mutationFn: deleteNotification,
    onMutate: async (notificationId) => {
      if (!user) return;

      await Promise.all([
        queryClient.cancelQueries({ queryKey: notificationQueryKeys.list(user.id) }),
        queryClient.cancelQueries({ queryKey: notificationQueryKeys.unreadCount(user.id) }),
      ]);

      const previousNotifications = queryClient.getQueryData<AppNotification[]>(
        notificationQueryKeys.list(user.id),
      );
      const previousUnreadCount = queryClient.getQueryData<number>(
        notificationQueryKeys.unreadCount(user.id),
      );

      if (previousNotifications) {
        const wasUnread = previousNotifications.some(
          (n) => n.id === notificationId && !n.read,
        );
        queryClient.setQueryData(
          notificationQueryKeys.list(user.id),
          previousNotifications.filter((n) => n.id !== notificationId),
        );
        if (wasUnread && typeof previousUnreadCount === 'number') {
          queryClient.setQueryData(
            notificationQueryKeys.unreadCount(user.id),
            Math.max(0, previousUnreadCount - 1),
          );
        }
      }

      return { previousNotifications, previousUnreadCount };
    },
    onError: (_error, _id, context) => {
      if (!user || !context) return;
      if (context.previousNotifications) {
        queryClient.setQueryData(notificationQueryKeys.list(user.id), context.previousNotifications);
      }
      if (typeof context.previousUnreadCount === 'number') {
        queryClient.setQueryData(notificationQueryKeys.unreadCount(user.id), context.previousUnreadCount);
      }
    },
    onSettled: () => {
      if (!user) return;
      queryClient.invalidateQueries({ queryKey: notificationQueryKeys.list(user.id) });
      queryClient.invalidateQueries({ queryKey: notificationQueryKeys.unreadCount(user.id) });
    },
  });

  // ── Delete all notifications ──
  const deleteAllMutation = useMutation({
    mutationFn: () => deleteAllNotifications(user!.id),
    onMutate: async () => {
      if (!user) return;
      await Promise.all([
        queryClient.cancelQueries({ queryKey: notificationQueryKeys.list(user.id) }),
        queryClient.cancelQueries({ queryKey: notificationQueryKeys.unreadCount(user.id) }),
      ]);
      const previousNotifications = queryClient.getQueryData<AppNotification[]>(
        notificationQueryKeys.list(user.id),
      );
      const previousUnreadCount = queryClient.getQueryData<number>(
        notificationQueryKeys.unreadCount(user.id),
      );
      queryClient.setQueryData(notificationQueryKeys.list(user.id), []);
      queryClient.setQueryData(notificationQueryKeys.unreadCount(user.id), 0);
      return { previousNotifications, previousUnreadCount };
    },
    onError: (_error, _variables, context) => {
      if (!user || !context) return;
      if (context.previousNotifications) {
        queryClient.setQueryData(notificationQueryKeys.list(user.id), context.previousNotifications);
      }
      if (typeof context.previousUnreadCount === 'number') {
        queryClient.setQueryData(notificationQueryKeys.unreadCount(user.id), context.previousUnreadCount);
      }
    },
    onSettled: () => {
      if (!user) return;
      queryClient.invalidateQueries({ queryKey: notificationQueryKeys.list(user.id) });
      queryClient.invalidateQueries({ queryKey: notificationQueryKeys.unreadCount(user.id) });
    },
  });

  const notifications = notificationsQuery.data || [];
  const fallbackUnreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications],
  );

  return {
    notifications,
    unreadCount:
      typeof unreadCountQuery.data === 'number' ? unreadCountQuery.data : fallbackUnreadCount,
    isLoading: includeList ? notificationsQuery.isLoading : unreadCountQuery.isLoading,
    isFetching: includeList ? notificationsQuery.isFetching : unreadCountQuery.isFetching,
    error: includeList ? notificationsQuery.error || unreadCountQuery.error : unreadCountQuery.error,
    markAsRead: markReadMutation.mutateAsync,
    markAllAsRead: markAllReadMutation.mutateAsync,
    deleteOne: deleteMutation.mutateAsync,
    deleteAll: deleteAllMutation.mutateAsync,
    isMarkingRead: markReadMutation.isPending,
    isMarkingAllRead: markAllReadMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isDeletingAll: deleteAllMutation.isPending,
  };
}
