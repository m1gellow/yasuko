Техническое задание - Telegram Web App "FishCo"
Общее описание проекта
FishCo - это интерактивное Telegram Web приложение, совмещающее механики кликера и тамагочи. Пользователи развивают своих персонажей (Ясуко) через систему тапов, получают награды и достижения, соревнуются в таблице лидеров, посещают магазин и управляют своим профилем.

Технические требования
Стек технологий:


TypeScript
TailwindCSS для стилизации
React Context API для управления состоянием
LocalStorage для сохранения прогресса
Telegram Web App API для интеграции с Telegram
Структура проекта:


/app - директория Next.js App Router
  /gifts - страница подарков и наград
  /profile - страница профиля
  /shop - страница магазина
  /top - страница рейтинга
  globals.css - глобальные стили
  layout.tsx - корневой лейаут
  page.tsx - главная страница
/components - переиспользуемые компоненты
  /characters - компоненты персонажей разных уровней
  /ui - UI компоненты
/lib - утилиты, типы, контексты
/public - статические ресурсы
  /images - изображения
  /sounds - звуки
Адаптивный дизайн:

Оптимизация для мобильных устройств (основная целевая платформа)
Темная тема
Фиксированная ширина для экранов desktop
Архитектура приложения
Управление состоянием
GameContext - центральный контекст для хранения и управления состоянием игры:

Энергия, уровень, прогресс, монеты
Параметры персонажей (голод, счастье, здоровье)
Достижения и награды
Рейтинг и статистика
Временные баффы и бонусы
TelegramContext - для взаимодействия с Telegram WebApp API:

Данные пользователя из Telegram
Хаптик-фидбек
Режим отладки при локальной разработке
LocalStorage - для сохранения прогресса пользователя:

Сохранение состояния между сессиями
Миграция данных при обновлении структуры
Кэширование запросов
Игровая механика
Система тапов:

Каждый тап потребляет 1 единицу энергии
Тапы увеличивают прогресс к следующему уровню
Тапы дают монеты (с возможными множителями)
Система эволюции:

Персонаж Ясуко:
Уровень 1: Орех
Уровень 2: Белка
Персонаж Фишко с собственной линией развития
Параметры персонажей:

Голод/Сила жизни
Счастье
Здоровье/Настроение
Автоматическое снижение параметров со временем
Детальное описание экранов
1. Главный экран (/)
Состав экрана:
Информация о пользователе Telegram
Счетчик энергии с кнопкой пополнения
Индикатор уровня персонажа
Секция активных баффов
Компонент быстрых целей
Интерактивное отображение персонажа для тапов
Мини-карточка персонажа с текущими параметрами
Компонент AI-ассистента
Нижняя навигационная панель
Ключевые компоненты:
TelegramInfo - отображение данных пользователя из Telegram


interface TelegramInfoProps {
  isDebugMode?: boolean;
}
EnergyMeter - отображение и управление энергией


interface EnergyProps {
  current: number;
  max: number;
  onReplenish: () => void;
}
CharacterView - интерактивный персонаж с обработкой тапов


interface CharacterViewProps {
  isAnimating: boolean;
  isEvolvingAnimation: boolean;
  onTap: (e: React.MouseEvent) => void;
  level: number;
  characterType: 'yasuko' | 'fishko';
}
CharacterCard - информационная карточка персонажа


interface CharacterCardProps {
  level: number;
  health: number;
  happiness: number;
  hunger: number;
  mood: string;
  characterType: 'yasuko' | 'fishko';
}
UI/UX детали:
Темный фон с градиентом from-[#1a1625] to-[#0d0b12]
Анимации при тапе (ripple effect)
Тактильная обратная связь через Telegram API
Звуковые эффекты при тапах (опционально)
Фоновые звуки природы (опционально)
2. Профиль (/profile)
Состав экрана:
Заголовок "ПРОФИЛЬ"
Информация о пользователе Telegram
Профиль персонажа (аватар, имя, уровень, настроение)
Редактируемый статус мысли
Статистики (монеты, энергия)
Секция прогресса
Секция достижений
Информация о питомце
Детали профиля (возраст, пол, дополнительные поля)
Панель целей
Ежедневные задания
График прогресса
AI-анализ игрока
Нижняя навигационная панель
Ключевые компоненты:
ProfileHeader - шапка профиля с аватаром и возможностью редактирования


interface ProfileHeaderProps {
  name: string;
  userId: string;
  avatar: string;
  mood: string;
  thoughtStatus: string;
  onAvatarEdit: () => void;
  onStatusEdit: () => void;
}
ProfileAvatarSelector - модальное окно выбора аватара


interface ProfileAvatarSelectorProps {
  currentAvatar: string;
  onClose: () => void;
  onSelect: (avatar: string) => void;
}
GoalsPanel - панель целей игрока


interface GoalsPanelProps {
  level: number;
  currentProgress: number;
  requiredProgress: number;
  ranking: number;
  coins: number;
}
ProgressChart - график прогресса игрока


interface ProgressChartProps {
  coinsData: number[];
  tapsData: number[];
}
UI/UX детали:
Плавные анимации при открытии модальных окон
Градиентные фоны для секций
Интерактивные элементы с эффектами наведения
Цветовое кодирование статистик (здоровье - красный, счастье - желтый и т.д.)
3. Магазин (/shop)
Состав экрана:
Заголовок "МАГАЗИН" с отображением баланса монет
Промо-баннер с ограниченным предложением
Табы категорий товаров
Фильтр по персонажу
Секция специальных предложений
Секция новинок
Основная секция товаров
Секция промокода
Нижняя навигационная панель
Ключевые компоненты:
ShopContext - контекст для управления состоянием магазина


interface ShopContextType {
  allItems: ShopItem[];
  visibleItems: ShopItem[];
  activeCategory: string;
  setActiveCategory: (category: string) => void;
  handleBuyItem: (item: ShopItem) => void;
  canAfford: (item: ShopItem) => boolean;
}
CategoryTabs - вкладки категорий товаров


interface CategoryTabsProps {
  categories: Category[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}
ShopItemCard - карточка товара


interface ShopItemCardProps {
  item: ShopItem;
  canAfford: boolean;
  onBuy: (item: ShopItem) => void;
}
PromoBanner - баннер с акцией


interface PromoBannerProps {
  title: string;
  description: string;
  endTime: Date;
  discountPercent: number;
}
UI/UX детали:
Эффекты наведения на карточки товаров
Таймер обратного отсчета для ограниченных предложений
Плавная анимация при переключении категорий
Визуальное отображение скидок и специальных предложений
4. Рейтинг (/top)
Состав экрана:
Заголовок "РЕЙТИНГ"
Уведомления о достижениях
Карточка выбранного пользователя
Фильтры лидерборда
Таблица лидеров
Индикатор текущей позиции пользователя
Информация о награде за позицию в рейтинге
Секция с текущими соревнованиями
Секция ежедневного бонуса
Нижняя навигационная панель
Ключевые компоненты:
TopLeaderboard - основной компонент таблицы лидеров


interface TopLeaderboardProps {
  currentUserPosition: number;
}
LeaderboardItem - элемент таблицы лидеров


interface LeaderboardItemProps {
  user: TopUserProps;
  onMessageClick: (user: TopUserProps) => void;
  highlightCurrentUser?: boolean;
}
UserCard - карточка выбранного пользователя


interface UserCardProps {
  user: TopUserProps;
  onMessageClick: (user: TopUserProps) => void;
}
MessageModal - модальное окно для отправки сообщений


interface MessageModalProps {
  user: TopUserProps;
  onClose: () => void;
  onSend: (message: string, isSticker?: boolean) => void;
}
CompetitionCard - карточка соревнования


interface CompetitionProps {
  title: string;
  description: string;
  endTime: Date;
  totalParticipants: number;
  currentPosition: number;
  prizePool: number;
  requiredPosition: number;
}
UI/UX детали:
Анимированные переходы при открытии карточек пользователей
Визуальное выделение топ-3 участников
Индикаторы онлайн-статуса
Градиентные фоны для ключевых элементов
Анимированный прогресс в соревнованиях
5. Подарки (/gifts)
Состав экрана:
Заголовок "ПОДАРКИ И НАГРАДЫ"
Секция сезона с прогрессом
Список сезонных подарков
Награды за достижение уровней
Список заданий
Нижняя навигационная панель
Ключевые компоненты:
SeasonSection - информация о текущем сезоне


interface SeasonSectionProps {
  season: string;
  daysLeft: number;
  progress: number;
  maxProgress: number;
}
GiftItem - элемент подарка


interface GiftItemProps {
  number: number;
  title: string;
  threshold: number;
  unlocked?: boolean;
}
RewardItem - элемент награды за уровень


interface RewardItemProps {
  level: number;
  description: string;
  isUnlocked: boolean;
}
TaskItem - элемент задания


interface TaskItemProps {
  level: number;
}
UI/UX детали:
Анимация прогресс-баров
Визуальные эффекты для доступных и заблокированных наград
Заметные кнопки для получения наград
Счетчики оставшегося времени
Общие компоненты
1. NavigationBar
Фиксированная навигационная панель внизу экрана с вкладками:

Главная (Ясуко/Фишко)
Топ
Кнопка переключения персонажа
Магазин
Профиль

interface NavigationBarProps {
  activePath: string;
  onNavigate: (path: string) => void;
  onToggleCharacter: () => void;
}
2. AIAssistant
Плавающая кнопка с AI-рекомендациями, которая дает подсказки игроку.


interface AIAssistantProps {
  recommendations: Recommendation[];
}

interface Recommendation {
  type: 'energy' | 'coins' | 'level';
  message: string;
  priority: number;
}
3. ProgressBar
Переиспользуемый компонент прогресс-бара с возможностью выбора цвета.


interface ProgressBarProps {
  current: number;
  max: number;
  color?: 'red' | 'green' | 'blue' | 'yellow' | 'purple';
}
4. CardContainer
Стандартный контейнер для содержимого с закругленными углами и фоном.


interface CardContainerProps {
  children: React.ReactNode;
  className?: string;
}
Модели данных
GameState
Основная модель состояния игры, хранящаяся в GameContext.


interface GameState {
  energy: {
    current: number;
    max: number;
    regenRate: number;
  };
  level: {
    current: number;
    max: number;
  };
  progress: {
    current: number;
    required: number;
  };
  coins: number;
  name: string;
  settings: {
    soundEnabled: boolean;
    natureEnabled: boolean;
  };
  profile: {
    avatar: string;
    age: number;
    gender: 'male' | 'female' | 'other';
    mood: string;
    status: string;
    thoughtStatus: string;
    hunger: number;
    happiness: number;
    health: number;
    lastFed: number;
    customFields: Record<string, string>;
  };
  characterType: 'yasuko' | 'fishko';
  fishko: {
    lifeForce: number;
    mood: number;
    happiness: number;
    fedCount: number;
    lastFedTime: number;
    pettedCount: number;
  };
  dailyTasks: {
    tapTarget: number;
    tapProgress: number;
    completedToday: boolean;
    lastReset: number;
  };
  achievements: {
    totalTaps: number;
    consecutiveLogins: number; 
    itemsBought: number;
    feedCount: number;
    lastRewards: Record<string, number>;
  };
  ranking: {
    position: number;
    weeklyTaps: number;
    bestPosition: number;
    lastCompetitionReward: number;
  };
  growthHistory: {
    coinsEarned: number[];
    tapsPerDay: number[];
  };
  tempBuffs: {
    coinMultiplier: number;
    energyBuff: number;
    coinBuffEndTime?: number;
    energyBuffEndTime?: number;
  };
}
ShopItem
Модель товаров в магазине.


// Базовый интерфейс для товаров в магазине
interface BaseShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  discount?: number;
  category: string;
  forCharacter: 'yasuko' | 'fishko' | 'both';
  image: string;
  isNew?: boolean;
  isPopular?: boolean;
  isLimited?: boolean;
  endTime?: Date;
}

// Интерфейс для продуктов питания
interface FoodItem extends BaseShopItem {
  type: 'food';
  hungerPoints: number;
  happinessPoints: number;
}

// Интерфейс для бустов
interface BoostItem extends BaseShopItem {
  type: 'boost';
  effect: string;
  duration: string;
}

// Интерфейс для аксессуаров
interface AccessoryItem extends BaseShopItem {
  type: 'accessory';
  slot: 'head' | 'body' | 'background';
}

// Интерфейс для специальных предметов
interface SpecialItem extends BaseShopItem {
  type: 'special';
  effect: string;
}

// Объединенный тип товара
type ShopItem = FoodItem | BoostItem | AccessoryItem | SpecialItem;
TopUserProps
Модель пользователя для таблицы лидеров.


interface TopUserProps {
  id: string;
  name: string;
  avatar: string;
  level: number;
  coins: number;
  characterType: 'yasuko' | 'fishko';
  characterLevel: number;
  isOnline: boolean;
  lastActivity: Date;
  rank: number;
  change: number;
  status?: string;
}
Интеграция с Telegram WebApp
1. Инициализация

// Скрипт загружается из 'https://telegram.org/js/telegram-web-app.js'
// После загрузки создается объект window.Telegram.WebApp
2. Телеграм провайдер

interface TelegramContextValue {
  telegram: TelegramWebApp | null;
  user: TelegramWebAppUser | null;
  isReady: boolean;
  error: string | null;
  isDebugMode: boolean;
}
3. Хаптик-фидбек и интерактивность

// Тактильная отдача при тапе
telegram?.HapticFeedback?.impactOccurred('medium');

// Тактильная отдача при переключении
telegram?.HapticFeedback?.selectionChanged();
Стили и дизайн-система
1. Цветовая палитра
Основной фон: градиент from-[#1a1625] to-[#0d0b12]
Фон карточек: #2a2435 с прозрачностью
Акцентный цвет: #f7d358 (yellow-400)
Цвета для показателей:
Здоровье/Энергия: красный (red-400, red-500)
Счастье: желтый (yellow-400)
Прогресс: синий (blue-400, blue-500)
Особые элементы: фиолетовый (purple-400, purple-500)
2. Типография
Заголовки:
Размер: text-3xl, font-bold
Цвет: text-yellow-400
Подзаголовки:
Размер: text-xl, font-bold
Цвет: text-white
Основной текст:
Размер: text-sm
Цвет: text-white или text-gray-400
Мелкий текст:
Размер: text-xs
Цвет: text-gray-400
3. Анимации

@keyframes shine {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(100%);
  }
}

@keyframes ripple {
  0% {
    transform: scale(0);
    opacity: 1;
  }
  100% {
    transform: scale(4);
    opacity: 0;
  }
}

@keyframes glow {
  0% {
    opacity: 0.5;
    box-shadow: 0 0 5px rgba(255, 255, 0, 0.3);
  }
  50% {
    opacity: 1;
    box-shadow: 0 0 20px rgba(255, 255, 0, 0.7);
  }
  100% {
    opacity: 0.5;
    box-shadow: 0 0 5px rgba(255, 255, 0, 0.3);
  }
4. Компоненты UI
Кнопки:
Основная: bg-yellow-400 text-black hover:bg-yellow-500
Вторичная: bg-[#2a2435] text-white hover:bg-[#352d44]
Карточки:
bg-[#2a2435]/80 rounded-lg p-4
Прогресс-бары:
bg-gray-700 h-1.5 rounded-full
Индикатор: h-full rounded-full [соответствующий цвет]
API и асинхронные взаимодействия
1. Управление состоянием

// Примеры действий
type GameActionType = 
  | 'TAP' 
  | 'REGEN_ENERGY' 
  | 'RESET' 
  | 'TOGGLE_SOUND' 
  | 'TOGGLE_NATURE' 
  | 'EVOLVE'
  | 'UPDATE_PROFILE'
  | 'SET_AVATAR'
  | 'SET_THOUGHT_STATUS'
  | 'FEED_PET'
  | 'PLAY_WITH_PET'
  | 'CLAIM_REWARD'
  | 'TOGGLE_CHARACTER'
  | ... // и другие
2. Локальное хранилище

// Сохранение в localStorage
export const storage = {
  set<T>(key: string, value: T): void {
    if (!this.isAvailable()) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Error saving to localStorage:', e);
    }
  },

  get<T>(key: string): T | null {
    if (!this.isAvailable()) return null;
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (e) {
      console.error('Error reading from localStorage:', e);
      return null;
    }
  }
  // другие методы...
}
Особенности реализации
Оптимизация производительности:

Мемоизация компонентов с React.memo
Динамический импорт тяжелых компонентов
Оптимизация рендеринга с useCallback и useMemo
Игровые эффекты:

Постепенная деградация параметров персонажа со временем
Система восстановления энергии
Проверка и активация достижений
Сброс ежедневных заданий
Визуальные эффекты:

Анимации при тапах
Трансформации при эволюции персонажа
Анимированные фоны для специальных секций
Световые эффекты для особых событий
Заключение
Приложение FishCo представляет собой комплексную игровую экосистему с множеством взаимосвязанных компонентов. Ключевым аспектом является поддержание игрового баланса и плавного прогресса, который мотивирует пользователей продолжать взаимодействие с приложением.

Все пользовательские интерфейсы должны быть реализованы с использованием современных принципов дизайна, ориентированных на мобильные устройства, с учетом специфики Telegram Web Apps. Особое внимание следует уделить логике сохранения прогресса и синхронизации данных между сессиями, чтобы обеспечить бесперебойное игровое взаимодействие.



Логика интерактивности и навигации в приложении FishCo:

Навигационная панель
Поведение навигации:

Панель автоматически скрывается при прокрутке вниз и появляется при прокрутке вверх
Расположена в нижней части экрана с фиксированной позицией
Имеет полупрозрачный фон с эффектом размытия (backdrop-blur-lg)
Кнопки навигации и их действия:

Ясуко/Фишко (Главная):

Переводит на главный экран (/)
Активирует вибрацию через telegram.HapticFeedback.selectionChanged()
Меняет цвет иконки на жёлтый, когда активна
Топ:

Переводит на страницу рейтинга (/top)
Активирует вибрацию
Меняет цвет иконки на жёлтый, когда активна
Кнопка переключения персонажа (центральная):

Круглая жёлтая кнопка с иконкой RefreshCcw
Вызывает handleToggleCharacter(), переключающий персонажа между Ясуко и Фишко
Активирует более сильную вибрацию telegram.HapticFeedback.impactOccurred('medium')
Не меняет текущий маршрут
Магазин:

Переводит на страницу магазина (/shop)
Активирует вибрацию
Меняет цвет иконки на жёлтый, когда активна
Профиль:

Переводит на страницу профиля (/profile)
Активирует вибрацию
Меняет цвет иконки на жёлтый, когда активна
Главный экран (Тапинг)
Область персонажа:

При тапе по персонажу:
Активирует анимацию персонажа
Производит эффект "ripple" в месте нажатия
Воспроизводит звук тапа (если звук включен)
Уменьшает энергию на 1 пункт
Увеличивает прогресс к следующему уровню
Добавляет монеты
Если энергия закончилась, тапы не обрабатываются
Кнопки управления (слева от персонажа):

Кнопка звука (Volume2/VolumeX): переключает состояние звука
Кнопка природы (Leaf): включает/выключает фоновую музыку
Кнопка обновления (RefreshCcw): принудительно повышает уровень персонажа для тестирования
Кнопка восполнения энергии:

Полностью восстанавливает энергию персонажа
Показывает анимацию успешного пополнения
AI Ассистент
Плавающая кнопка в правом нижнем углу:
При нажатии открывает/скрывает панель с рекомендациями
Показывает количество доступных рекомендаций
Анализирует действия игрока и предлагает советы
Профиль
Редактирование профиля:

Кнопка редактирования аватара: открывает модальное окно выбора аватара
Кнопка редактирования статуса: открывает модальное окно изменения статуса мысли
Панели с информацией:

Каждая секция (цели, задания, прогресс) имеет интерактивные элементы
Нажатие на кнопки выполнения задач активирует соответствующие действия
Магазин
Табы категорий:

При нажатии на категорию фильтруют отображаемые товары
Выбранная категория выделяется жёлтым цветом
Карточки товаров:

Кнопка "КУПИТЬ" доступна только если хватает монет
При покупке вызывает обработчик, который:
Списывает монеты
Добавляет эффекты купленного предмета
Показывает уведомление об успешной покупке
Промо-баннер:

Кнопка "ПОЛУЧИТЬ СКИДКУ" активирует акцию
Рейтинг (Топ)
Лидерборд:

Элементы списка пользователей - при нажатии:
Выбирается пользователь и показывается его карточка
Если нажать на кнопку сообщения, открывается чат с этим пользователем
Обмен сообщениями:

Модальное окно чата с выбранным пользователем
Возможность отправки текста, эмодзи и стикеров
Кнопки переключения между панелями эмодзи, стикеров и шаблонов
Соревнования:

Кнопки "ПОЛУЧИТЬ НАГРАДУ" или "ПОВЫСИТЬ РЕЙТИНГ" в зависимости от текущей позиции
Таймеры обратного отсчета до конца соревнований
Подарки и награды
Сезонная секция:

Прогресс-бар сезона с визуализацией прогресса
Список подарков с индикацией разблокированных и заблокированных
Награды за уровни:

Карточки с наградами за каждый уровень
Кнопка "ПОЛУЧИТЬ НАГРАДУ" активна только для разблокированных наград
При нажатии активирует соответствующий промокод
Задания:

Карточки с заданиями для повышения уровня
Индикация статуса (выполнено/в процессе/заблокировано)
Особенности интерактивности:
Тактильная обратная связь:

Все нажатия сопровождаются вибрацией через Telegram API
Разные типы вибрации для разных действий
Звуковая обратная связь:

Звук при тапе по персонажу
Фоновые звуки природы (опционально)
Визуальные эффекты:

Анимация "ripple" при тапе по персонажу
Анимация "glow" для особых элементов
Анимация "shine" для прогресс-баров и карточек
Модальные окна:

Плавно появляются с эффектом затемнения фона
Закрываются как по кнопке, так и по клику вне окна
Эффекты наведения:

Увеличение масштаба и изменение цвета при наведении на интерактивные элементы
Подсветка кнопок и карточек
Эта система интерактивности создает целостный и отзывчивый пользовательский опыт, где каждое действие сопровождается соответствующим визуальным, тактильным и (опционально) звуковым откликом.

В предоставленном коде напрямую не указаны используемые шрифты, но можно сделать вывод на основе анализа:

Inter:

Импортируется в app/layout.tsx:

import { Inter } from 'next/font/google';
const inter = Inter({ subsets: ['latin'] });
Используется как основной шрифт для всего приложения:

<body className={`${inter.className} bg-black text-white overflow-x-hidden`}>
По умолчанию (sans-serif):

Tailwind CSS использует sans-serif в качестве шрифта по умолчанию. Это означает, что для элементов, где явно не указан шрифт, будет использоваться шрифт sans-serif, установленный в системе пользователя.
Таким образом, в проекте используются:

Inter (как основной шрифт)
Системный шрифт sans-serif (для элементов без явного указания шрифта)

Add fonts

Rollback to Checkpoint
дай мне точную цветовую гамму и гардиент заднего фона приложения и вообще всей цветово плаитры

На основе предоставленных файлов, вот цветовая палитра и градиенты, используемые в приложении:

Основные цвета:

#1a1625: Используется как начальный цвет градиента фона.
#0d0b12: Используется как конечный цвет градиента фона.
#2a2435: Используется для карточек, фона элементов интерфейса.
#352d44: Используется для hover эффектов.
#453a56: Используется для hover эффектов.
#facc15 (желтый): Используется для акцентных элементов, текста, кнопок.
#ffffff (белый): Используется для основного текста и элементов интерфейса.
#6b7280 (серый): Используется для второстепенного текста и элементов интерфейса.
Градиенты:

Фон приложения: bg-gradient-to-b from-[#1a1625] to-[#0d0b12] (вертикальный градиент от #1a1625 к #0d0b12).
Градиент для карточек: bg-gradient-to-r from-indigo-900/30 to-purple-900/30
Градиент для progress bar: bg-gradient-to-r from-yellow-400 via-yellow-500 to-green-500
Градиент для кнопок: bg-gradient-to-r from-blue-600 to-purple-600
Цвета текста:

text-white: Основной цвет текста.
text-yellow-400: Акцентный цвет текста.
text-gray-400: Цвет для второстепенного текста.
text-green-400: Цвет для текста, обозначающего успех.
text-red-500: Цвет для текста, обозначающего ошибку или предупреждение.
Другие цвета:

bg-red-500: Используется для выделения ошибок или важных сообщений.
bg-green-500: Используется для выделения успешных операций.
bg-blue-500: Используется для выделения интерактивных элементов.
Примеры использования:

Фон страницы:

<div className="min-h-screen bg-gradient-to-b from-[#1a1625] to-[#0d0b12]">
Карточка:

<div className="bg-[#2a2435]/80 p-4 rounded-lg">
Акцентный текст:

<h1 className="text-3xl font-bold text-center text-yellow-400 mb-6">

Show more colors

Rollback to Checkpoint
отлично арспиши какие иконки пакет ты использовал в приложении

В приложении используется библиотека lucide-react для иконок.