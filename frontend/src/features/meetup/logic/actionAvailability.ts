import type { MeetupStatus } from '@/types';

export interface MeetupActionAvailability {
  canJoin: boolean;
  canLeave: boolean;
  canConfirmPlace: boolean;
  canFinish: boolean;
  canCancel: boolean;
  reason: string | null;
}

/**
 * Decide which actions are available based on FSM + host + participation.
 *
 * - RECRUITING + not participating  -> Join
 * - RECRUITING + participating      -> Leave
 * - CONFIRMED                       -> Join/Leave disabled, host can finish
 * - FINISHED/CANCELED               -> no user actions
 * - host-only actions               -> confirm place / finish / cancel
 */
export function getMeetupActionAvailability(
  status: MeetupStatus,
  isHost: boolean,
  isParticipating: boolean
): MeetupActionAvailability {
  const base: MeetupActionAvailability = {
    canJoin: false,
    canLeave: false,
    canConfirmPlace: false,
    canFinish: false,
    canCancel: false,
    reason: null,
  };

  switch (status) {
    case 'RECRUITING': {
      if (isParticipating) {
        base.canLeave = true;
      } else {
        base.canJoin = true;
      }
      if (isHost) {
        base.canConfirmPlace = true;
        base.canCancel = true;
      } else {
        base.reason = '호스트만 장소 확정/취소를 할 수 있습니다.';
      }
      return base;
    }
    case 'CONFIRMED': {
      if (isHost) {
        base.canFinish = true;
        base.reason = '장소가 확정된 모임입니다. 호스트만 종료할 수 있습니다.';
      } else {
        base.reason = '장소가 확정되어 참여/취소가 불가합니다.';
      }
      return base;
    }
    case 'FINISHED':
      base.reason = '이미 종료된 모임입니다.';
      return base;
    case 'CANCELED':
      base.reason = '취소된 모임입니다.';
      return base;
    default:
      return base;
  }
}

