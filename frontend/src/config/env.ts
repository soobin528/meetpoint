/**
 * 환경 변수. Vite는 VITE_ 접두사만 노출.
 * 로컬: .env.development 에 VITE_API_BASE_URL=http://localhost:8000
 */
export const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '',
  /** SSE 스트림은 동일 오리진이면 상대 경로, 아니면 apiBaseUrl + path */
  get streamBaseUrl(): string {
    return this.apiBaseUrl || '';
  },
  /** Optional global meetups stream endpoint (e.g. /meetups/stream). */
  meetupsStreamUrl: import.meta.env.VITE_MEETUPS_STREAM_URL ?? '',
  /** Enable verbose SSE debug logging when true. */
  debugSse: import.meta.env.VITE_DEBUG_SSE === 'true',
} as const;
