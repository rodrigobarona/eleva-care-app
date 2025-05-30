'use client';

import { cn } from '@/lib/utils';
import {
  type EnhancedAvatarData,
  getEnhancedAvatarData,
  getGravatarUrl,
  GravatarDefault,
  type GravatarOptions,
} from '@/lib/utils/gravatar';
import { User } from 'lucide-react';
import Image from 'next/image';
import React from 'react';

interface GravatarAvatarProps {
  email: string;
  name?: string;
  size?: number;
  className?: string;
  gravatarOptions?: GravatarOptions;
  showFallback?: boolean;
  enhanced?: boolean; // Whether to use API key features
  showTooltip?: boolean; // Show profile info on hover
}

/**
 * GravatarAvatar component with Gravatar support and performance optimizations
 * - Loads Gravatar asynchronously without blocking UI
 * - Shows fallback while loading
 * - Handles errors gracefully
 * - Uses Next.js Image for optimization
 * - Optional enhanced mode with API key for rich profile data
 */
export function GravatarAvatar({
  email,
  name,
  size = 40,
  className,
  gravatarOptions = {},
  showFallback = true,
  enhanced = false,
  showTooltip = false,
}: GravatarAvatarProps) {
  const [gravatarUrl, setGravatarUrl] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasError, setHasError] = React.useState(false);
  const [profileData, setProfileData] = React.useState<EnhancedAvatarData | null>(null);

  // Generate Gravatar URL asynchronously
  React.useEffect(() => {
    if (!email) {
      setIsLoading(false);
      return;
    }

    const loadGravatar = async () => {
      try {
        if (enhanced) {
          // Use enhanced API with profile data
          const enhancedData = await getEnhancedAvatarData(email, {
            size,
            default: GravatarDefault.MM,
            rating: 'pg',
            ...gravatarOptions,
          });

          if (enhancedData) {
            setGravatarUrl(enhancedData.avatarUrl);
            setProfileData(enhancedData);
          } else {
            // Fallback to basic URL generation
            const basicUrl = getGravatarUrl(email, {
              size,
              default: GravatarDefault.MM,
              rating: 'pg',
              ...gravatarOptions,
            });
            setGravatarUrl(basicUrl);
          }
        } else {
          // Basic mode - just generate URL optimistically
          const optimisticUrl = getGravatarUrl(email, {
            size,
            default: GravatarDefault.MM,
            rating: 'pg',
            ...gravatarOptions,
          });
          setGravatarUrl(optimisticUrl);
        }
      } catch (error) {
        console.warn('Error loading Gravatar:', error);
        // Fallback to basic URL generation
        const fallbackUrl = getGravatarUrl(email, {
          size,
          default: GravatarDefault.MM,
          rating: 'pg',
          ...gravatarOptions,
        });
        setGravatarUrl(fallbackUrl);
      } finally {
        setIsLoading(false);
      }
    };

    loadGravatar();
  }, [email, size, gravatarOptions, enhanced]);

  // Handle image load error
  const handleImageError = () => {
    setHasError(true);
    setGravatarUrl(null);
  };

  // Handle successful image load
  const handleImageLoad = () => {
    setHasError(false);
  };

  // Get initials from name or email
  const getInitials = React.useMemo(() => {
    // Use display name from profile if available
    const displayName = profileData?.displayName || name;

    if (displayName) {
      return displayName
        .split(' ')
        .map((word) => word[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
    }

    if (email) {
      return email.slice(0, 2).toUpperCase();
    }

    return 'U';
  }, [name, email, profileData?.displayName]);

  const baseClasses = cn(
    'relative inline-flex items-center justify-center rounded-full bg-muted',
    'overflow-hidden border border-border/50',
    showTooltip && 'cursor-help',
    className,
  );

  const sizeStyles = {
    width: size,
    height: size,
    fontSize: Math.max(10, size * 0.4),
  };

  // Create tooltip content if enhanced mode and profile data available
  const tooltipContent = React.useMemo(() => {
    if (!showTooltip || !profileData) return null;

    const parts = [];
    if (profileData.displayName) parts.push(profileData.displayName);
    if (profileData.jobTitle) parts.push(profileData.jobTitle);
    if (profileData.company) parts.push(`at ${profileData.company}`);
    if (profileData.location) parts.push(profileData.location);

    return parts.length > 0 ? parts.join(' • ') : null;
  }, [showTooltip, profileData]);

  // Show loading state
  if (isLoading) {
    return (
      <div className={baseClasses} style={sizeStyles}>
        <div className="h-3 w-3 animate-pulse rounded-full bg-muted-foreground/20" />
      </div>
    );
  }

  // Show Gravatar if available and no error
  if (gravatarUrl && !hasError) {
    const imageElement = (
      <div className={baseClasses} style={{ width: size, height: size }}>
        <Image
          src={gravatarUrl}
          alt={profileData?.displayName || name || email || 'Avatar'}
          width={size}
          height={size}
          className="h-full w-full object-cover"
          onError={handleImageError}
          onLoad={handleImageLoad}
          unoptimized // Allow external Gravatar URLs
        />
      </div>
    );

    // Add tooltip if enabled and content available
    if (tooltipContent) {
      return <div title={tooltipContent}>{imageElement}</div>;
    }

    return imageElement;
  }

  // Show fallback (initials or icon)
  if (showFallback) {
    const fallbackElement = (
      <div className={baseClasses} style={sizeStyles}>
        {name || email || profileData?.displayName ? (
          <span
            className="select-none font-medium text-muted-foreground"
            style={{ fontSize: Math.max(10, size * 0.35) }}
          >
            {getInitials}
          </span>
        ) : (
          <User className="text-muted-foreground" size={Math.max(12, size * 0.5)} />
        )}
      </div>
    );

    // Add tooltip for fallback too if enhanced data available
    if (tooltipContent) {
      return <div title={tooltipContent}>{fallbackElement}</div>;
    }

    return fallbackElement;
  }

  // No fallback requested
  return null;
}
