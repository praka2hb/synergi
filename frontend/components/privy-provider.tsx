"use client"

import { PrivyProvider, type PrivyClientConfig } from '@privy-io/react-auth';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

interface CustomPrivyProviderProps {
  children: React.ReactNode;
}

export function CustomPrivyProvider({ children }: CustomPrivyProviderProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  // Determine if we're in dark mode
  const isDarkMode = mounted ? resolvedTheme === 'dark' : false;

  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID || '';
  
  const privyConfig: PrivyClientConfig = {
    // Privy login methods (email only)
    loginMethods: ['email'],
    
    // Appearance customization
    appearance: {
      theme: isDarkMode ? 'dark' : 'light',
      accentColor: '#58dfdd', // Synergi teal color
      logo: '/synergi.svg', // Use Synergi logo
      landingHeader: 'Welcome to Synergi',
      loginMessage: 'Login to access your AI agents',
    },
  };

  // Don't render until mounted to avoid hydration issues
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <PrivyProvider
      appId={appId}
      config={privyConfig}
    >
      {children}
    </PrivyProvider>
  );
}

