import { StoreItem, TapTarget } from "../types";

export const generateMainContentProps = (
  user: any,
  state: any,
  userRank: number,
  notifications: any[],
  tapTarget: TapTarget,
  showCharacterCard: boolean,
  showPurchaseNotification: boolean,
  lastPurchase: StoreItem | null,
  isTapAnimationActive: boolean,
  handlers: {
    handleMarkAsRead: (id: string) => void;
    handleMarkAllAsRead: () => void;
    handleDeleteNotification: (id: string) => void;
    handleRefillEnergy: () => void;
    handleTap: (points: number) => void;
    handleLevelUp: () => void;
    handlePurchase: (item: StoreItem) => void;
    setActiveTab: (tab: string) => void;
    handleToggleCharacterCard: () => void;
    getRecommendations: () => any[];
  }
) => {
  return {
    user: user
      ? {
          id: user.id || 'guest',
          name: user.name || 'Гость',
          username: user.phone || 'guest',
          phone: parseInt(user.phone || '0') || 0,
          level: state.level.current,
          energy: {
            current: Math.round(state.energy.current),
            max: state.energy.max,
            replenishRate: state.energy.regenRate,
          },
          score: Math.round(state.coins),
          rating: state.progress.current,
          maxRating: state.progress.required,
          items: [],
          achievements: [],
          lastActive: new Date(),
          dailyLoginDay: 1,
          position: userRank,
          telegram_id: user.telegram_id ? parseInt(user.telegram_id) : undefined,
          avatar_url: user.avatar_url || undefined,
          promo_codes_used: user.promo_codes_used || null,
        }
      : {
          id: 'guest',
          name: 'Гость',
          username: 'guest',
          phone: 0,
          level: state.level.current,
          energy: {
            current: Math.round(state.energy.current),
            max: state.energy.max,
            replenishRate: state.energy.regenRate,
          },
          score: Math.round(state.coins),
          rating: state.progress.current,
          maxRating: state.progress.required,
          items: [],
          achievements: [],
          lastActive: new Date(),
          dailyLoginDay: 1,
          position: 0,
        },
    position: userRank,
    notifications: notifications,
    onMarkAsRead: handlers.handleMarkAsRead,
    onMarkAllAsRead: handlers.handleMarkAllAsRead,
    onDeleteNotification: handlers.handleDeleteNotification,
    state: state,
    tapTarget: tapTarget,
    onRefillEnergy: handlers.handleRefillEnergy,
    onTap: handlers.handleTap,
    onLevelUp: handlers.handleLevelUp,
    showCharacterCard: showCharacterCard,
    getRecommendations: handlers.getRecommendations,
    onPurchase: handlers.handlePurchase,
    onTabChange: handlers.setActiveTab,
    onToggleCharacterCard: handlers.handleToggleCharacterCard,
    showPurchaseNotification: showPurchaseNotification,
    lastPurchase: lastPurchase,
    isTapAnimationActive: isTapAnimationActive,
  };
};