'use client';

import { Icons } from './icons';

interface LogoProps {
  variant?: 'default' | 'white';
  className?: string;
}

const Logo = ({ variant = 'default', className = '' }: LogoProps) => {
  return (
    <Icons.elevaCareLogo
      className={className}
      style={{ color: variant === 'white' ? 'white' : 'currentColor' }}
    />
  );
};

export default Logo;
