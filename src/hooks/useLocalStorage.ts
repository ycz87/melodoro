import { useState, useEffect } from 'react';

export function useLocalStorage<T>(
  key: string,
  initialValue: T | (() => T),
  migrate?: (raw: unknown) => T,
) {
  const resolveInitialValue = () => (
    typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue
  );

  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return resolveInitialValue();
      const parsed = JSON.parse(stored);
      return migrate ? migrate(parsed) : parsed;
    } catch {
      return resolveInitialValue();
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage full or unavailable — silently ignore
    }
  }, [key, value]);

  return [value, setValue] as const;
}
