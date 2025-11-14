import { useState, useEffect } from 'react';

// Helper function to convert timestamp strings back to Date objects
function reviveTimestamps(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(reviveTimestamps);
  }
  
  if (typeof obj === 'object') {
    const revived: any = {};
    for (const key in obj) {
      if (key === 'timestamp' && typeof obj[key] === 'string') {
        // Convert timestamp string back to Date
        const date = new Date(obj[key]);
        revived[key] = isNaN(date.getTime()) ? obj[key] : date;
      } else if (key === 'messages' && Array.isArray(obj[key])) {
        // Recursively process messages array
        revived[key] = obj[key].map((msg: any) => {
          if (msg.timestamp && typeof msg.timestamp === 'string') {
            const date = new Date(msg.timestamp);
            return { ...msg, timestamp: isNaN(date.getTime()) ? msg.timestamp : date };
          }
          return msg;
        });
      } else {
        revived[key] = reviveTimestamps(obj[key]);
      }
    }
    return revived;
  }
  
  return obj;
}

// A function to get the initial value from localStorage or use a default
function getStorageValue<T>(key: string, defaultValue: T): T {
  // Getting stored value
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(key);
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved) as T;
        // Revive timestamps from strings to Date objects
        return reviveTimestamps(parsed) as T;
      } catch (error) {
        console.error(`Error parsing localStorage key "${key}":`, error);
        return defaultValue;
      }
    }
  }
  return defaultValue;
}

export const useLocalStorage = <T,>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const [value, setValue] = useState<T>(() => {
    return getStorageValue(key, defaultValue);
  });

  useEffect(() => {
    // Storing value
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
};