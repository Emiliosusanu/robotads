import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { LogOut, UserCircle, Menu, X, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Navbar = ({ navItems, user }) => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const sidebarVariants = {
    open: { x: 0, transition: { type: "spring", stiffness: 300, damping: 30 } },
    closed: { x: "-100%", transition: { type: "spring", stiffness: 300, damping: 30 } },
  };

  const navItemVariants = {
    hover: { scale: 1.05, color: "#a78bfa" },
    tap: { scale: 0.95 }
  };

  return (
    <>
      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-md shadow-lg p-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold text-purple-400">
          <Zap size={28} />
          Robotads
        </Link>
        <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-slate-300 hover:text-purple-400">
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </Button>
      </header>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.aside
            initial="closed"
            animate="open"
            exit="closed"
            variants={sidebarVariants}
            className="md:hidden fixed top-0 left-0 h-full w-64 bg-slate-900 shadow-xl z-40 pt-20 p-6 flex flex-col"
          >
            <nav className="flex-grow">
              <ul>
                {navItems.map((item) => (
                  <li key={item.label} className="mb-3">
                    <motion.div whileHover="hover" whileTap="tap" variants={navItemVariants}>
                      <Link
                        to={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 p-3 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-purple-400 transition-colors duration-200"
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </Link>
                    </motion.div>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="mt-auto">
              <div className="flex items-center gap-3 p-3 mb-4 text-slate-400">
                <UserCircle size={24} />
                <span className="truncate">{user?.email}</span>
              </div>
              <Button
                variant="ghost"
                onClick={() => {
                  handleLogout();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white"
              >
                <LogOut size={20} />
                Logout
              </Button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
       {mobileMenuOpen && <div className="md:hidden fixed inset-0 bg-black/50 z-30" onClick={() => setMobileMenuOpen(false)}></div>}


      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed top-0 left-0 h-full w-64 bg-slate-900 shadow-xl flex-col p-6 border-r border-slate-700/50">
        <Link to="/" className="flex items-center gap-2 text-2xl font-bold text-purple-400 mb-10 px-2">
          <Zap size={32} />
          Robotads
        </Link>
        <nav className="flex-grow">
          <ul>
            {navItems.map((item) => (
              <li key={item.label} className="mb-2">
                <motion.div whileHover="hover" whileTap="tap" variants={navItemVariants}>
                  <Link
                    to={item.href}
                    className="flex items-center gap-3 p-3 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-purple-400 transition-colors duration-200"
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                </motion.div>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-auto">
          <div className="flex items-center gap-3 p-3 mb-4 text-slate-400 border-t border-slate-700/50 pt-6">
            <UserCircle size={24} />
            <span className="truncate">{user?.email}</span>
          </div>
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white"
          >
            <LogOut size={20} />
            Logout
          </Button>
        </div>
      </aside>
    </>
  );
};

export default Navbar;