import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useGame } from '../../contexts/GameContext';
import { tournamentService } from '../../services/tournamentService';
import { notificationService } from '../../services/notificationService';
import {useNavigate} from 'react-router-dom';


interface CompetitionCardProps {
  title: string;
  endTime: string;
  participants: number;
  position: number;
  requiredPosition: number;
  prizePool: number;
  tournamentId?: string;
}

const CompetitionCard: React.FC<CompetitionCardProps> = ({ 
  title, 
  endTime, 
  participants, 
  position, 
  requiredPosition,
  prizePool,
  tournamentId
}) => {
  const { user } = useAuth();
  const { dispatch } = useGame();
  const [isLoading, setIsLoading] = useState(false);
  const [canClaimReward, setCanClaimReward] = useState(false);
  const [tournamentPosition, setTournamentPosition] = useState({
    position,
    previousPosition: position,
    change: 0
  });

  // Проверяем, достиг ли пользователь требуемой позиции
  const hasAchievedPosition = tournamentPosition.position <= requiredPosition;

  let navigate = useNavigate()

  useEffect(() => {
    if (user && tournamentId) {
      // Проверяем возможность получения награды
      const checkReward = async () => {
        try {
          const canClaim = await tournamentService.canClaimTournamentReward(user.id, tournamentId);
          setCanClaimReward(canClaim);
        } catch (error) {
          console.error('Error checking tournament reward status:', error);
        }
      };

      // Получаем позицию в турнире
      const loadPosition = async () => {
        try {
          const position = await tournamentService.getUserTournamentPosition(user.id, tournamentId);
          if (position) {
            setTournamentPosition(position);
          } else {
            // Если не удалось получить позицию, используем текущий ранг
            setTournamentPosition({
              position,
              previousPosition: position,
              change: 0
            });
          }
        } catch (error) {
          console.error('Error loading tournament position:', error);
        }
      };

      checkReward();
      loadPosition();
    } else {
      // Если пользователь не авторизован или нет ID турнира, используем позицию из props
      setTournamentPosition({
        position,
        previousPosition: position,
        change: 0
      });
    }
  }, [user, tournamentId, position]);

  const handleClaimReward = async () => {
    if (!user || !tournamentId || !canClaimReward || !hasAchievedPosition) return;
    
    setIsLoading(true);
    try {
      const result = await tournamentService.claimTournamentReward(user.id, tournamentId);
      
      if (result.success && result.reward) {
        // Обновляем состояние игры
        dispatch({ 
          type: 'CLAIM_REWARD', 
          payload: { type: 'coins', amount: result.reward.coins } 
        });
        
        // Уведомление уже создаётся в функции claimTournamentReward
        
        // Обновляем локальное состояние
        setCanClaimReward(false);
      }
    } catch (error) {
      console.error('Error claiming tournament reward:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#252538] flex flex-col gap-[1rem] items-center justify-center rounded-lg p-4 mb-4">
      
      <h3 className="font-bold text-yellow-500 mb-2">{title}</h3>
      <h4 className="font-medium text-xl">Главный приз <span className="text-yellow-500">{prizePool} ₽</span></h4>
      <p className="text-[white] font-light text-xs uppercase text-center">правила очень простые! Для участия в розыгрыше нужно занять лидирующую поизицию в рейтинге с 1 по 20 место. Победитель будет выбран слачайно среди первых 20 игроков!</p>
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Участников:</span>
          <span>{participants}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Ваша позиция:</span>
          <span className={hasAchievedPosition ? 'text-green-500' : 'text-red-500'}>
            #{tournamentPosition.position || position || "?"}
            {tournamentPosition.change !== 0 && (
              <span className={tournamentPosition.change > 0 ? 'text-green-500 ml-1' : 'text-red-500 ml-1'}>
                ({tournamentPosition.change > 0 ? '+' : ''}{tournamentPosition.change})
              </span>
            )}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Призовой фонд: </span>
          <span className="text-yellow-500"> {prizePool} ₽</span>
        </div>



        {/* <button 
          className={`w-full ${
            (isLoading || !user) ? 'bg-gray-600' :
        'bg-yellow-500'
          } text-black py-2 rounded-lg font-medium mt-2`}
          disabled={isLoading || !user || (hasAchievedPosition && !canClaimReward)}
          onClick={() => navigate('/leaderboard')}
        >
          Открыть рейтинг
        </button> */}
        
        <button 
          className={`w-full ${
            (isLoading || !user) ? 'bg-gray-600' : 
            hasAchievedPosition && canClaimReward ? 'bg-green-500' : 'bg-yellow-500'
          } text-black py-2 rounded-lg font-medium mt-2`}
          disabled={isLoading || !user || (hasAchievedPosition && !canClaimReward)}
          onClick={hasAchievedPosition && canClaimReward ? handleClaimReward : undefined}
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <span className="w-4 h-4 mr-2 border-2 border-t-transparent border-black rounded-full animate-spin"></span>
              Получение...
            </span>
          ) : hasAchievedPosition ? (
            canClaimReward ? 'ПОЛУЧИТЬ НАГРАДУ' : 'НАГРАДА ПОЛУЧЕНА'
          ) : (
            'ПОВЫСИТЬ РЕЙТИНГ'
          )}
        </button>
      </div>
    </div>
  );
};

export default CompetitionCard;