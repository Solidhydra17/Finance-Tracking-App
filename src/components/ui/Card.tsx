import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  gradient?: boolean;
  onClick?: () => void;
  id?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  gradient = false,
  onClick,
  id,
}) => {
  return (
    <div
      id={id}
      className={`
        bg-white rounded-2xl shadow-soft overflow-hidden
        ${gradient ? 'bg-gradient-to-br from-primary-50 to-primary-100' : ''}
        ${onClick ? 'cursor-pointer hover:shadow-medium transition-shadow' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div className={`px-4 py-3 border-b border-gray-100 ${className}`}>{children}</div>
);

export const CardBody: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => <div className={`p-4 ${className}`}>{children}</div>;
