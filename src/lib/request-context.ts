import { AsyncLocalStorage } from 'node:async_hooks';

type RequestStore = {
  request: Request;
  userId?: string;
};

const requestStorage = new AsyncLocalStorage<RequestStore>();

/** Keep the current request available to Effect runners that do not receive it. */
export function runWithRequest<T>(request: Request, fn: () => T): T {
  return requestStorage.run({ request }, fn);
}

export function currentRequest(): Request | undefined {
  return requestStorage.getStore()?.request;
}

export function currentRequestUserId(): string | undefined {
  return requestStorage.getStore()?.userId;
}

/** Remember a user id that this request has already resolved. */
export function setRequestUserId(userId: string): void {
  const store = requestStorage.getStore();
  if (store) store.userId = userId;
}
