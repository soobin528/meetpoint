import { useMutation, useQueryClient } from '@tanstack/react-query';
import { meetupKeys } from '@/shared/api';
import { createMeetup } from '@/features/meetup/api';
import type { MeetupCategory } from '@/types';

export interface CreateMeetupInput {
  title: string;
  description: string;
  category: MeetupCategory;
  scheduledAt: string;
  capacity: number;
  lat: number;
  lng: number;
  hostUserId: number;
}

export function useCreateMeetup(onSuccess?: () => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateMeetupInput) => {
      const body = {
        title: input.title,
        description: input.description || undefined,
        category: input.category,
        capacity: input.capacity,
        lat: input.lat,
        lng: input.lng,
        host_user_id: input.hostUserId,
      };
      return createMeetup(body);
    },
    // Avoid long retry loops that can make the UI appear stuck.
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: meetupKeys.all });
      onSuccess?.();
    },
  });
}

