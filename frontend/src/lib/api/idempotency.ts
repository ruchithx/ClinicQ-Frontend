import { useCallback, useRef } from 'react';

export function useIdempotencyKey() {
  const keyRef = useRef<string>(crypto.randomUUID());

  const renew = useCallback(() => {
    keyRef.current = crypto.randomUUID();
  }, []);

  return {
    get key() {
      return keyRef.current;
    },
    renew,
  };
}
