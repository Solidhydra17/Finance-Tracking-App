import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  ArrowsRightLeftIcon,
  WalletIcon,
  Cog6ToothIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';

interface BottomNavProps {
  onAddClick: () => void;
}

const navItems = [
  { path: '/', label: 'Home', icon: HomeIcon },
  { path: '/transactions', label: 'Transactions', icon: ArrowsRightLeftIcon },
  { path: '/wallet', label: 'Wallet', icon: WalletIcon },
  { path: '/settings', label: 'Settings', icon: Cog6ToothIcon },
];

export const BottomNav: React.FC<BottomNavProps> = ({ onAddClick }) => {
  const location = useLocation();
  const isAddPage = location.pathname === '/add-transaction';

  const handleAddClick = () => {
    if (isAddPage) return;
    onAddClick();
  };

  return (
    <nav
      id="bottom-nav-bar"
      aria-label="Primary"
      className="fixed inset-x-4 bottom-[max(0.85rem,env(safe-area-inset-bottom))] z-40 h-[104px]"
    >
      <div className="pointer-events-none absolute inset-0 [filter:drop-shadow(0_-2px_5px_rgba(17,24,39,0.18))_drop-shadow(0_-8px_16px_rgba(17,24,39,0.16))_drop-shadow(0_4px_8px_rgba(17,24,39,0.10))] dark:[filter:drop-shadow(0_0_1px_rgba(255,255,255,0.18))_drop-shadow(0_-8px_18px_rgba(0,0,0,0.9))]">
        <div className="absolute bottom-0 left-0 top-10 w-[calc(50%-78px)] rounded-l-full bg-white dark:bg-[#16161c]" />
        <div className="absolute bottom-0 right-0 top-10 w-[calc(50%-78px)] rounded-r-full bg-white dark:bg-[#16161c]" />
        <svg className="absolute left-1/2 top-0 h-[104px] w-[180px] -translate-x-1/2 text-white dark:text-[#16161c]" viewBox="0 0 180 104" aria-hidden="true">
          <path fill="currentColor" d="M0 40 H26 C42 40 48 42 54 54 C62 70 72 76 90 76 C108 76 118 70 126 54 C132 42 138 40 154 40 H180 V104 H0 Z" />
        </svg>
      </div>

      <div className="absolute inset-x-0 bottom-0 flex h-16 items-center">
        <div className="grid flex-1 grid-cols-2">
          {navItems.slice(0, 2).map((item) => (
            <NavItem key={item.path} item={item} />
          ))}
        </div>
        <div className="w-[4.5rem] shrink-0" />
        <div className="grid flex-1 grid-cols-2">
          {navItems.slice(2).map((item) => (
            <NavItem key={item.path} item={item} />
          ))}
        </div>
      </div>

      <button
        id="btn-main-add"
        type="button"
        aria-label="Add"
        onClick={handleAddClick}
        disabled={isAddPage}
        className={`absolute left-1/2 top-1.5 flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-full transition-all duration-300 ${
          isAddPage
            ? 'cursor-not-allowed bg-gray-200 text-gray-400 dark:bg-gray-800'
            : 'bg-midblue text-white shadow-[0_10px_24px_rgba(40,92,204,0.45)] hover:scale-110 active:scale-95'
        }`}
      >
        <PlusIcon className="h-7 w-7 stroke-[2.5]" />
      </button>
    </nav>
  );
};

const NavItem = ({ item }: { item: (typeof navItems)[number] }) => (
  <NavLink
    id={`nav-link-${item.label.toLowerCase()}`}
    to={item.path}
    end={item.path === '/'}
    aria-label={item.label}
    className={({ isActive }) =>
      `flex h-12 items-center justify-center rounded-full transition-all duration-300 ${
        isActive ? 'scale-110 text-midblue dark:text-white' : 'text-gray-400 dark:text-gray-300'
      }`
    }
  >
    <item.icon className="h-6 w-6" />
  </NavLink>
);
