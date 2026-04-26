import React, { useEffect, useState } from 'react';
import { useUIStore } from '@/store';
import { Icon } from './Icon';

export const ConnectivityListener: React.FC = () => {
  const { setOnline } = useUIStore();

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnline]);

  return null;
};

const StatusToastContent: React.FC<{ isOnline: boolean; onExpire: () => void }> = ({ isOnline, onExpire }) => {
  const [isExiting, setIsExiting] = useState(false);
  const duration = isOnline ? 3000 : 5000;

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onExpire, 400);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onExpire]);

  return (
    <div 
      className={`
        fixed bottom-24 left-1/2 z-[60]
        w-full max-w-[calc(100%-48px)] sm:max-w-xs
        rounded-2xl shadow-hard overflow-hidden
        flex flex-col border border-white/10 backdrop-blur-md
        transition-all duration-400
        ${isOnline ? 'bg-success-600' : 'bg-gray-800'}
        ${isExiting ? 'animate-slide-out-down-centered opacity-0' : 'animate-slide-up-centered'}
      `}
      style={{ transform: 'translateX(-50%)' }}
    >
      <div className="flex flex-col items-center gap-2 px-6 py-5">
        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0">
          <Icon 
            name={isOnline ? 'WifiIcon' : 'NoSymbolIcon'} 
            className="w-7 h-7 text-white" 
          />
        </div>
        <div className="text-center">
          <p className="text-base font-black tracking-tight leading-tight text-white">
            {isOnline ? 'Back Online' : 'No Connection'}
          </p>
          <p className="text-xs font-bold opacity-80 leading-tight mt-1 text-white/90">
            {isOnline 
              ? 'Syncing your data now...' 
              : 'You are working offline.'}
          </p>
        </div>
      </div>
      
      {/* Timer Bar */}
      <div className="h-1 bg-white/20 w-full mt-auto">
        <div 
          className="h-full bg-white/60 animate-shrink"
          style={{ animationDuration: `${duration}ms` }}
        />
      </div>
    </div>
  );
};

export const StatusToast: React.FC = () => {
  const isOnline = useUIStore((state) => state.isOnline);
  const [show, setShow] = useState(false);
  const [activeType, setActiveType] = useState<boolean | null>(null);

  useEffect(() => {
    // Only trigger if starting offline or on actual change
    if (activeType === null) {
      setActiveType(isOnline);
      if (!isOnline) setShow(true);
    } else if (activeType !== isOnline) {
      setActiveType(isOnline);
      setShow(true);
    }
  }, [isOnline, activeType]);

  if (!show) return null;

  return (
    <StatusToastContent 
      key={`${activeType}-${Date.now()}`} // Unique key forces fresh component + timer
      isOnline={!!activeType} 
      onExpire={() => setShow(false)} 
    />
  );
};
