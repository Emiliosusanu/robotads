import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { LogIn, UserPlus, Mail, Lock, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

const AuthPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast({
          title: "Account Created!",
          description: "Please check your email to verify your account.",
          variant: "success",
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({
          title: "Logged In!",
          description: "Welcome back to Robotads!",
          variant: "success",
        });
      }
    } catch (error) {
      toast({
        title: "Authentication Error",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const cardVariants = {
    initial: { opacity: 0, y: 50, scale: 0.9 },
    animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: "easeOut" } },
  };

  const inputVariants = {
    focus: { scale: 1.02, boxShadow: "0 0 0 2px rgba(167, 139, 250, 0.5)" },
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <motion.div 
        className="w-full max-w-md bg-slate-800/70 backdrop-blur-lg shadow-2xl rounded-xl p-8 md:p-12 border border-slate-700/50"
        variants={cardVariants}
        initial="initial"
        animate="animate"
      >
        <div className="text-center mb-10">
          <Zap size={56} className="mx-auto text-purple-400 mb-4" />
          <h1 className="text-4xl font-bold text-slate-100">Robotads</h1>
          <p className="text-purple-300 mt-1">{isSignUp ? 'Create your account' : 'Welcome back'}</p>
        </div>
        
        <form onSubmit={handleAuth} className="space-y-6">
          <div>
            <Label htmlFor="email" className="text-slate-300 mb-1 block">Email</Label>
            <motion.div className="relative" whileFocus="focus" variants={inputVariants}>
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" size={20} />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-slate-700/50 border-slate-600 text-slate-100 placeholder-slate-500 pl-10 focus:ring-purple-500 focus:border-purple-500"
              />
            </motion.div>
          </div>
          <div>
            <Label htmlFor="password" className="text-slate-300 mb-1 block">Password</Label>
            <motion.div className="relative" whileFocus="focus" variants={inputVariants}>
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" size={20} />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-slate-700/50 border-slate-600 text-slate-100 placeholder-slate-500 pl-10 focus:ring-purple-500 focus:border-purple-500"
              />
            </motion.div>
          </div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button type="submit" disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700 text-white text-lg py-3">
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : isSignUp ? (
                <>
                  <UserPlus className="mr-2" size={20} /> Sign Up
                </>
              ) : (
                <>
                  <LogIn className="mr-2" size={20} /> Login
                </>
              )}
            </Button>
          </motion.div>
        </form>
        <p className="mt-8 text-center text-sm text-slate-400">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="font-medium text-purple-400 hover:text-purple-300 focus:outline-none"
          >
            {isSignUp ? 'Login' : 'Sign Up'}
          </button>
        </p>
      </motion.div>
    </div>
  );
};

export default AuthPage;