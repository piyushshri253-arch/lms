import React from 'react';

interface IconProps extends React.HTMLAttributes<HTMLSpanElement> {
  name: string;
  fill?: boolean;
  size?: number | string;
  className?: string;
}

export const Icon: React.FC<IconProps> = ({
  name,
  fill = false,
  size,
  className = '',
  style,
  ...props
}) => {
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
      {name}
    </span>
  );
};

export default Icon;
