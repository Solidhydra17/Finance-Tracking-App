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
