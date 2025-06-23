import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { LogOut, UserCircle, Settings, Bell, Menu, Zap, LayoutGrid, BarChart3, Users, Tag, Link2 as LinkIcon, ChevronDown, BarChartHorizontal, Activity, Briefcase, HelpCircle, CheckSquare, UserCog } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const TopNavigation = ({ user, navItems }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };
  
  const getInitials = (email) => {
    if (!email) return "?";
    const parts = email.split('@')[0].split(/[._-]/);
    return parts.map(part => part[0]).join('').toUpperCase().slice(0,2);
  };

  const mainNavItems = navItems.filter(item => !item.isSecondary);
  const secondaryNavItems = navItems.filter(item => item.isSecondary);

  const NavLink = ({ item, onClick }) => (
    <Link
      to={item.href}
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors
                  ${location.pathname === item.href 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
    >
      {React.cloneElement(item.icon, {size: 18})}
      <span>{item.label}</span>
    </Link>
  );
  
  const DropdownNavLink = ({ item, onClick }) => (
     <DropdownMenuItem
        onClick={() => { navigate(item.href); if(onClick) onClick(); }}
        className={`flex items-center gap-2 cursor-pointer ${location.pathname === item.href ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground' }`}
      >
        {React.cloneElement(item.icon, {size: 16})}
        <span>{item.label}</span>
      </DropdownMenuItem>
  );


  const MobileMenu = () => (
    <AnimatePresence>
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="md:hidden absolute top-16 left-0 right-0 bg-background border-b border-border shadow-lg p-4 space-y-2 z-40"
        >
          {mainNavItems.map(item => <NavLink key={item.href} item={item} onClick={() => setMobileMenuOpen(false)} />)}
          {secondaryNavItems.length > 0 && <DropdownMenuSeparator className="bg-border my-2"/>}
          {secondaryNavItems.map(item => <NavLink key={item.href} item={item} onClick={() => setMobileMenuOpen(false)} />)}
        </motion.div>
      )}
    </AnimatePresence>
  );


  return (
    <>
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-background/90 backdrop-blur-md border-b border-border flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold text-primary">
          <Zap size={28} />
          <span className="hidden sm:inline">Robotads</span>
        </Link>
        <nav className="hidden md:flex items-center gap-2">
          {mainNavItems.map(item => <NavLink key={item.href} item={item} />)}
          
          {secondaryNavItems.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
                  More <ChevronDown size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-popover border-border text-popover-foreground" align="start">
                {secondaryNavItems.map(item => <DropdownNavLink key={item.href} item={item} /> )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary relative">
          <Bell size={20} />
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
              <Avatar className="h-9 w-9 border-2 border-primary/50 hover:border-primary transition-colors">
                <AvatarImage src={user?.user_metadata?.avatar_url || `https://avatar.vercel.sh/${user?.email}.png?size=40`} alt={user?.email} />
                <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                  {getInitials(user?.email)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-60 bg-popover border-border text-popover-foreground" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none text-foreground">{user?.user_metadata?.full_name || user?.email?.split('@')[0]}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuGroup>
              <DropdownMenuItem className="hover:bg-muted/50 cursor-pointer" onClick={() => navigate('/')}>
                <LayoutGrid className="mr-2 h-4 w-4 text-primary" />
                <span>Dashboard</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="hover:bg-muted/50 cursor-pointer" onClick={() => navigate('/settings')}>
                <Settings className="mr-2 h-4 w-4 text-primary" />
                <span>Settings</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="bg-border"/>
            <DropdownMenuItem className="text-red-500 hover:bg-red-500/10 hover:text-red-400 cursor-pointer focus:bg-red-500/10 focus:text-red-400" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(prev => !prev)} className="md:hidden text-muted-foreground hover:text-primary">
          <Menu size={24} />
        </Button>
      </div>
    </header>
    <MobileMenu />
    </>
  );
};

export default TopNavigation;