import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';

import { 
  HomeIcon, 
  ArrowsRightLeftIcon, 
  BanknotesIcon, 
  Cog6ToothIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

interface BottomNavProps {
  onAddClick: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ onAddClick }) => {
  const location = useLocation();
  const isAddPage = location.pathname === '/add-transaction';

  const navItems = [
    { path: '/', label: 'Home', icon: HomeIcon },
    { path: '/transactions', label: 'Transactions', icon: ArrowsRightLeftIcon },
    { path: '/loans', label: 'Loans', icon: BanknotesIcon },
    { path: '/settings', label: 'Settings', icon: Cog6ToothIcon },
  ];

  const handleFABClick = () => {
    // Logical lockdown: ignore clicks if on the add page
    if (isAddPage) return;
    onAddClick();
  };

  return (
    <nav id="bottom-nav-bar" className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 safe-area-pb z-40 px-4">
      <div className="flex items-center justify-between h-20">
        {/* Left Side Items */}
        <div id="nav-left-items" className="flex flex-1 justify-around">
          {navItems.slice(0, 2).map((item) => (
            <NavLink
              id={`nav-link-${item.label.toLowerCase()}`}
              key={item.path}
              to={item.path}
              className={({ isActive }) => `
                flex flex-col items-center justify-center gap-1
                transition-all duration-300
                ${isActive ? 'text-midblue scale-110' : 'text-gray-400 hover:text-midblue/60'}
              `}
            >
              <item.icon className="w-6 h-6" />
              <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label}</span>
            </NavLink>
          ))}
        </div>

        {/* FAB Placeholder Space */}
        <div className="w-20" />

        {/* Right Side Items */}
        <div id="nav-right-items" className="flex flex-1 justify-around">
          {navItems.slice(2, 4).map((item) => (
            <NavLink
              id={`nav-link-${item.label.toLowerCase()}`}
              key={item.path}
              to={item.path}
              className={({ isActive }) => `
                flex flex-col items-center justify-center gap-1
                transition-all duration-300
                ${isActive ? 'text-midblue scale-110' : 'text-gray-400 hover:text-midblue/60'}
              `}
            >
              <item.icon className="w-6 h-6" />
              <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </div>

      {/* FAB Add Button */}
      <button
        id="btn-main-add"
        onClick={handleFABClick}
        disabled={isAddPage}
        className={`
          absolute left-1/2 -translate-x-1/2 -top-8
          w-16 h-16 rounded-full
          flex items-center justify-center
          transition-all duration-300
          border-4 border-white shadow-xl
          ${isAddPage 
            ? 'bg-gray-100 cursor-not-allowed scale-95 opacity-80' 
            : 'bg-midblue text-white shadow-[0_8px_25px_rgba(40,92,204,0.4)] hover:scale-110 active:scale-95'
          }
        `}
      >
        <PlusIcon className={`w-10 h-10 stroke-[3] ${isAddPage ? 'text-gray-400' : 'text-white'}`} />
      </button>
    </nav>
  );
};
