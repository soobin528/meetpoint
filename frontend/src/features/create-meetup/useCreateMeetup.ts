import { useMutation, useQueryClient } from '@tanstack/react-query';
import { meetupKeys } from '@/shared/api';
import { createMeetup } from '@/features/meetup/api';
import type { MeetupResponse } from '@/types';

export interface CreateMeetupInput {
  title: string;
  description: string;
  category: string;
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
        capacity: input.capacity,
        lat: input.lat,
        lng: input.lng,
        host_user_id: input.hostUserId,
      };
      return createMeetup(body);
    },
    onSuccess: (data: MeetupResponse) => {
      queryClient.invalidateQueries({ queryKey: meetupKeys.all });
      onSuccess?.();
    },
  });
}

