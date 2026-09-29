import { API_URL, APP_TOKEN } from './config';
import type { ChatTurn, LensResult } from './types';

/** The Worker gives the main model 15 s and the fallback 12 s, so it answers within this. */
const TIMEOUT_MS = 30_000;

export type ApiErrorKind = 'unreadable' | 'not_a_document' | 'timeout' | 'network' | 'server' | 'canceled';

export class ApiError extends Error {
  constructor(public kind: ApiErrorKind) {
    super(kind);
  }
}

async function post<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  if (signal?.aborted) throw new ApiError('canceled');
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, TIMEOUT_MS);
  const cancel = () => controller.abort();
  signal?.addEventListener('abort', cancel);

  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-app-token': APP_TOKEN },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data: any = await res.json().catch(() => null);
    if (controller.signal.aborted) throw new Error('aborted');
    // 422: the Worker judged the photo not readable or not a document.
    if (res.status === 422) throw new ApiError(data?.error === 'not_a_document' ? 'not_a_document' : 'unreadable');
    if (!res.ok || !data) throw new ApiError('server');
    return data as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(timedOut ? 'timeout' : signal?.aborted ? 'canceled' : 'network');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }
}

export function analyzeImage(base64: string, language: string, signal?: AbortSignal) {
  return post<LensResult>('/analyze', { image: base64, mimeType: 'image/jpeg', language }, signal);
}

export function askQuestion(result: LensResult, question: string, history: ChatTurn[], language: string) {
  return post<{ answer: string }>('/ask', { result, question, history, language });
}
