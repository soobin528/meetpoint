import { config } from '@/config';

const baseUrl = config.apiBaseUrl;

/** Thrown on non-2xx response. status and detail (e.g. 409 message) for inline UI. */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly detail?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Thrown when a request was intentionally aborted (e.g. bbox refetch). Not user-facing. */
export class AbortRequestError extends Error {
  constructor(message = 'Request aborted') {
    super(message);
    this.name = 'AbortRequestError';
  }
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    // DOMException in browsers
    'name' in error &&
    (error as { name: string }).name === 'AbortError'
  );
}

async function handleResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!res.ok) {
    let detail: string | undefined;
    try {
      const json = JSON.parse(text) as { detail?: string };
      detail = typeof json.detail === 'string' ? json.detail : text;
    } catch {
      detail = text;
    }
    throw new ApiError(`API ${res.status}: ${detail ?? text}`, res.status, detail);
  }
  return (text ? JSON.parse(text) : undefined) as T;
}

interface RequestInitExtra {
  signal?: AbortSignal;
}

export async function apiGet<T>(path: string, init?: RequestInitExtra): Promise<T> {
  const url = path.startsWith('http') ? path : `${baseUrl}${path}`;
  try {
    const res = await fetch(url, { signal: init?.signal });
    return handleResponse<T>(res);
  } catch (error) {
    if (isAbortError(error)) {
      throw new AbortRequestError();
    }
    throw error;
  }
}

export async function apiPost<T, B = unknown>(path: string, body?: B, init?: RequestInitExtra): Promise<T> {
  const url = path.startsWith('http') ? path : `${baseUrl}${path}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body != null ? JSON.stringify(body) : undefined,
      signal: init?.signal,
    });
    return handleResponse<T>(res);
  } catch (error) {
    if (isAbortError(error)) {
      throw new AbortRequestError();
    }
    throw error;
  }
}

export async function apiDelete<T>(path: string, body?: unknown, init?: RequestInitExtra): Promise<T> {
  const url = path.startsWith('http') ? path : `${baseUrl}${path}`;
  try {
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: body != null ? JSON.stringify(body) : undefined,
      signal: init?.signal,
    });
    return handleResponse<T>(res);
  } catch (error) {
    if (isAbortError(error)) {
      throw new AbortRequestError();
    }
    throw error;
  }
}

