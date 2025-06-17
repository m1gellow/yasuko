// Script to clear all application cache
console.log('Clearing application cache...');

// List of cache keys to clear
const cacheKeys = [
  'app:user',
  'app:gameState',
  'app:character',
  'app:leaderboard',
  'app:levels',
  'app:phrases:*',
  'app:referrals:*',
  'app:storeItems',
  'app:promoCodes',
  'supabase:*'
];

// Check if localStorage is available (browser environment)
if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
  try {
    // Clear Supabase auth data if stored in localStorage
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('sb-') || cacheKeys.some(pattern => {
        if (pattern.endsWith('*')) {
          return key.startsWith(pattern.slice(0, -1));
        }
        return key === pattern;
      })) {
        console.log(`Removing: ${key}`);
        localStorage.removeItem(key);
      }
    }
    console.log('Cache cleared successfully!');
    
    // Reload the page to apply changes
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
} else {
  console.log('localStorage не доступен в этой среде. Пропускаем очистку кэша браузера.');
}