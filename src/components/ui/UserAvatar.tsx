'use client';

import React, { useState } from 'react';
import { Icon } from './Icon';

interface UserAvatarProps {
  avatar?: string | null;
  name?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | number;
  className?: string;
  shape?: 'rounded' | 'circle';
}

function getInitials(name?: string | null): string {
  if (!name || !name.trim()) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  avatar,
  name,
  size = 'md',
  className = '',
  shape = 'circle'
}) => {
  const [imageError, setImageError] = useState(false);

  // Size mappings
  let sizeClass = 'w-9 h-9 text-xs';
  let iconSize = 18;

  if (typeof size === 'number') {
    sizeClass = `w-[${size}px] h-[${size}px] text-xs`;
    iconSize = Math.round(size * 0.5);
  } else {
    switch (size) {
      case 'xs':
        sizeClass = 'w-6 h-6 text-[10px]';
        iconSize = 13;
        break;
      case 'sm':
        sizeClass = 'w-8 h-8 text-xs';
        iconSize = 16;
        break;
      case 'md':
        sizeClass = 'w-10 h-10 text-sm';
        iconSize = 20;
        break;
      case 'lg':
        sizeClass = 'w-12 h-12 text-base';
        iconSize = 24;
        break;
      case 'xl':
        sizeClass = 'w-16 h-16 text-lg';
        iconSize = 32;
        break;
      case '2xl':
        sizeClass = 'w-20 h-20 text-xl font-bold';
        iconSize = 40;
        break;
    }
  }

  const shapeClass = shape === 'rounded' ? 'rounded-2xl' : 'rounded-full';
  const initials = getInitials(name);

  // If user has uploaded a custom profile picture and it hasn't errored
  if (avatar && avatar.trim() && !imageError) {
    return (
      <img
        src={avatar}
        alt={name || 'User Profile Avatar'}
        onError={() => setImageError(true)}
        className={`${sizeClass} ${shapeClass} object-cover border border-outline-variant/60 shadow-2xs shrink-0 ${className}`}
      />
    );
  }

  // Clean empty placeholder avatar state with user initials or generic silhouette icon
  return (
    <div
      className={`${sizeClass} ${shapeClass} bg-primary/10 text-primary border border-primary/25 flex items-center justify-center font-black select-none shrink-0 shadow-2xs ${className}`}
      title={name || 'User Profile'}
    >
      {initials ? (
        <span className="tracking-tighter">{initials}</span>
      ) : (
        <Icon name="person" size={iconSize} className="opacity-80" />
      )}
    </div>
  );
};
