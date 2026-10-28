import React from 'react';

interface IconProps extends React.HTMLAttributes<HTMLSpanElement> {
  name: string;
  fill?: boolean;
  size?: number | string;
  className?: string;
}

const ICON_NAME_MAP: Record<string, string> = {
  sparkles: 'auto_awesome',
  loader: 'progress_activity'
};

export const Icon: React.FC<IconProps> = ({
  name,
  fill = false,
  size,
  className = '',
  style,
  ...props
}) => {
  const glyphName = ICON_NAME_MAP[name] || name;

  return (
    <span
      className={`material-symbols-outlined ${fill ? 'fill' : ''} ${className}`}
      style={{
        fontSize: size ? (typeof size === 'number' ? `${size}px` : size) : undefined,
        fontVariationSettings: fill ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" : undefined,
        ...style
      }}
      {...props}
    >
      {glyphName}
    </span>
  );
};

export default Icon;
