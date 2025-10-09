"use client"

import { usePrivy } from '@privy-io/react-auth';
import { Button } from '@/components/ui/button';
import { Loader2, LogOut, Mail } from 'lucide-react';
import { usePrivyAuth } from '@/hooks/use-privy-auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export function PrivyLoginButton() {
  const { ready } = usePrivy();
  const { isAuthenticated, isLoading, login, logout, user } = usePrivyAuth();

  if (!ready || isLoading) {
    return (
      <Button disabled variant="outline" className="gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading...
      </Button>
    );
  }

  if (isAuthenticated && user) {
    // Get initials for avatar
    const getInitials = () => {
      if (user.name) {
        return user.name
          .split(' ')
          .map(n => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);
      }
      if (user.email) {
        return user.email.slice(0, 2).toUpperCase();
      }
      return 'U';
    };

    const displayName = user.name || user.email || 'User';

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2 px-3">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <span className="hidden sm:inline">{displayName}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {user.email && (
            <DropdownMenuItem disabled className="text-xs text-muted-foreground">
              {user.email}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={logout} className="text-destructive cursor-pointer">
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Button onClick={login} className="gap-2 bg-primary hover:bg-primary/90">
      <Mail className="h-4 w-4" />
      Login
    </Button>
  );
}

