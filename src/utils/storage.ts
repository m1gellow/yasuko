/**
 * Расширенная утилита для работы с localStorage с проверками,
 * обработкой ошибок и поддержкой кэширования
 */
export const storage = {
  /**
   * Проверяет доступность localStorage
   */
  isAvailable(): boolean {
    try {
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return false;
      }
      const testKey = '__test__';
      localStorage.setItem(testKey, testKey);
      localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  },

  /**
   * Сохраняет значение в localStorage
   */
  set<T>(key: string, value: T, expirationMinutes?: number): void {
    if (!this.isAvailable()) return;
    try {
      // Если указан срок действия, добавляем метаданные об истечении срока
      const item = expirationMinutes
        ? {
            value,
            expiry: new Date().getTime() + expirationMinutes * 60 * 1000
          }
        : { value };

      localStorage.setItem(key, JSON.stringify(item));
    } catch (e) {
      console.error('Error saving to localStorage:', e);
    }
  },

  /**
   * Получает значение из localStorage с проверкой срока действия
   */
  get<T>(key: string): T | null {
    if (!this.isAvailable()) return null;
    try {
      const itemStr = localStorage.getItem(key);
      if (!itemStr) return null;
      
      const item = JSON.parse(itemStr);
      
      // Проверяем, истекло ли время хранения
      if (item.expiry && new Date().getTime() > item.expiry) {
        localStorage.removeItem(key);
        return null;
      }
      
      return item.value;
    } catch (e) {
      console.error('Error reading from localStorage:', e);
      return null;
    }
  },

  /**
   * Удаляет значение из localStorage
   */
  remove(key: string): void {
    if (!this.isAvailable()) return;
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error('Error removing from localStorage:', e);
    }
  },

  /**
   * Очищает всё хранилище
   */
  clear(): void {
    if (!this.isAvailable()) return;
    try {
      localStorage.clear();
    } catch (e) {
      console.error('Error clearing localStorage:', e);
    }
  },

  /**
   * Определяет, есть ли значение по ключу
   */
  has(key: string): boolean {
    if (!this.isAvailable()) return false;
    return localStorage.getItem(key) !== null;
  },
  
  /**
   * Обновляет только часть сохраненного объекта
   */
  update<T extends object>(key: string, partialValue: Partial<T>): void {
    if (!this.isAvailable()) return;
    try {
      const current = this.get<T>(key);
      if (current) {
        this.set(key, { ...current, ...partialValue });
      }
    } catch (e) {
      console.error('Error updating localStorage item:', e);
    }
  }
};