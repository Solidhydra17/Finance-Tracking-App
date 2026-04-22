import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';

interface BottomNavProps {
  onAddClick: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ onAddClick }) => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Home', icon: '🏠' },
    { path: '/transactions', label: 'Transactions', icon: '💳' },
    { path: '/loans', label: 'Loans', icon: '📋' },
    { path: '/recurring', label: 'Recurring', icon: '🔄' },
    { path: '/settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 safe-area-pb z-40">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `
              flex flex-col items-center justify-center gap-0.5 px-4 py-2 rounded-xl
              transition-colors duration-200
              ${
                isActive
                  ? 'text-primary-600 bg-primary-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }
            `}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-xs font-medium">{item.label}</span>
          </NavLink>
        ))}
      </div>

      {/* FAB Add Button */}
      <button
        onClick={onAddClick}
        className="
          absolute left-1/2 -translate-x-1/2 -top-6
          w-14 h-14 rounded-full
          bg-gradient-to-br from-primary-400 to-primary-600
          shadow-medium flex items-center justify-center
          hover:shadow-hard transition-shadow duration-200
          text-white text-2xl
        "
      >
        +
      </button>
    </nav>
  );
};
