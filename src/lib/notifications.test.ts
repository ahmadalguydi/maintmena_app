import { describe, expect, it } from 'vitest';
import {
  getNotificationPresentation,
  getNotificationTarget,
  isMessageNotification,
} from '@/lib/notifications';

describe('notifications', () => {
  it('uses fallback copy for known notification types', () => {
    const presentation = getNotificationPresentation(
      {
        notification_type: 'seller_arrived',
        title: null,
        message: null,
      },
      'en',
    );

    expect(presentation.title).toBe('Provider arrived!');
    expect(presentation.category).toBe('job');
  });

  it('prefers stored notification text when present', () => {
    const presentation = getNotificationPresentation(
      {
        notification_type: 'job_completed',
        title: 'Custom title',
        message: 'Custom message',
      },
      'ar',
    );

    expect(presentation.title).toBe('Custom title');
    expect(presentation.message).toBe('Custom message');
  });

  it('routes message notifications directly to the request thread', () => {
    expect(
      getNotificationTarget(
        {
          notification_type: 'new_message',
          content_id: 'request-1',
        },
        'buyer',
      ),
    ).toBe('/app/messages/thread?request=request-1');

    expect(isMessageNotification({ notification_type: 'new_message' })).toBe(true);
  });

  it('routes request notifications to role-specific request screens', () => {
    expect(
      getNotificationTarget(
        {
          notification_type: 'seller_arrived',
          content_id: 'request-1',
        },
        'buyer',
      ),
    ).toBe('/app/buyer/request/request-1');

    expect(
      getNotificationTarget(
        {
          notification_type: 'job_completed',
          content_id: 'request-1',
        },
        'seller',
      ),
    ).toBe('/app/seller/job/request-1');
  });
});
