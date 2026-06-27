import React from 'react';
import * as Icons from '@heroicons/react/24/outline';

export type IconName = keyof typeof Icons;

interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: string;
}

export const Icon: React.FC<IconProps> = ({ name, ...props }) => {
  const IconComponent = (Icons as any)[name];

  if (!IconComponent) {
    // Fallback to a default icon if not found
    return <Icons.QuestionMarkCircleIcon {...props} />;
  }

  return <IconComponent {...props} />;
};

export const AVAILABLE_ICONS = [
  'HomeIcon',
  'BuildingOfficeIcon',
  'BuildingStorefrontIcon',
  'BanknotesIcon',
  'CreditCardIcon',
  'WalletIcon',
  'ChartBarIcon',
  'ArrowTrendingUpIcon',
  'ArrowTrendingDownIcon',
  'ShoppingCartIcon',
  'ShoppingBagIcon',
  'TagIcon',
  'GiftIcon',
  'HeartIcon',
  'ShieldCheckIcon',
  'BoltIcon',
  'WifiIcon',
  'DevicePhoneMobileIcon',
  'TvIcon',
  'TruckIcon',
  'MapPinIcon',
  'BusIcon',
  'BriefcaseIcon',
  'AcademicCapIcon',
  'BookOpenIcon',
  'FilmIcon',
  'MusicalNoteIcon',
  'PuzzlePieceIcon',
  'GlobeAltIcon',
  'SparklesIcon',
  'WrenchScrewdriverIcon',
  'ComputerDesktopIcon',
  'DocumentTextIcon',
  'DocumentCheckIcon',
  'UserGroupIcon',
  'FaceSmileIcon',
  'CakeIcon',
  'FireIcon',
  'PlusCircleIcon',
  'ClockIcon'
];
