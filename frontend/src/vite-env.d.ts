/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_MEETUPS_STREAM_URL?: string;
  readonly VITE_DEBUG_SSE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
