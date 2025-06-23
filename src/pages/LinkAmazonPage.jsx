
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Link2, Zap, Loader2, RefreshCcw, Trash2, ShieldAlert, Info, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useNavigate, useLocation } from 'react-router-dom';
import LinkedAccountsList from '@/components/amazon/LinkedAccountsList'; 
import { AMAZON_CLIENT_ID_FROM_ENV } from '@/config/amazonConstants';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3 } }
};

const LinkAmazonPage = () => {
  const [loading, setLoading] = useState(false);
  const [isUnlinkingAll, setIsUnlinkingAll] = useState(false);
  const [user, setUser] = useState(null);
  const [linkedAccounts, setLinkedAccounts] = useState([]);
  const [isFetchingAccounts, setIsFetchingAccounts] = useState(true);
  const [showTechDetails, setShowTechDetails] = useState(false);
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const accountIdToRelink = location.state?.accountIdToRelink;
  const client_id_for_relink = location.state?.client_id || AMAZON_CLIENT_ID_FROM_ENV;

  const fetchUser = useCallback(async () => {
    const { data: { user: currentUser }, error } = await supabase.auth.getUser();
    if (error) {
      console.error("LinkAmazonPage - Error fetching user:", error);
      toast({ title: "Authentication Error", description: "Could not fetch user session. Please log in again.", variant: "destructive" });
      navigate('/auth');
      return;
    }
    if (!currentUser) {
      console.log("LinkAmazonPage - No user session found, redirecting to auth.");
      toast({ title: "Not Authenticated", description: "Please log in to access this page.", variant: "destructive" });
      navigate('/auth');
      return;
    }
    setUser(currentUser);
  }, [toast, navigate]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const fetchLinkedAccounts = useCallback(async () => {
    if (!user) return;
    setIsFetchingAccounts(true);
    try {
      const { data, error } = await supabase
        .from('amazon_accounts')
        .select('id, name, status, last_sync, client_id, amazon_profile_id, amazon_region')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setLinkedAccounts(data || []);
    } catch (error) {
      console.error("LinkAmazonPage - Error fetching linked accounts:", error);
      toast({
        title: "Error Fetching Accounts",
        description: `Could not load your linked accounts: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsFetchingAccounts(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user) {
      fetchLinkedAccounts();
    }
  }, [user, fetchLinkedAccounts]);

  const handleLinkAmazonAccount = (isRelink = false, specificClientId = null, relinkAccountId = null) => {
    if (loading) return; 

    if (!user) {
      console.error("[LinkAmazonPage] User not authenticated. Aborting link process.");
      toast({ title: "Authentication Error", description: "Your session has expired. Please log in.", variant: "destructive" });
      navigate('/auth');
      return;
    }

    const effectiveClientId = specificClientId || AMAZON_CLIENT_ID_FROM_ENV;
    if (!effectiveClientId) {
        console.error("[LinkAmazonPage] Amazon Client ID is missing.");
        toast({ title: "Configuration Error", description: "Amazon Client ID is missing. Please contact support.", variant: "destructive" });
        return;
    }
    
    const csrfToken = crypto.randomUUID();
    
    try {
      sessionStorage.setItem('amazon_oauth_csrf_token', csrfToken);
      localStorage.setItem('amazon_oauth_csrf_token', csrfToken); 
      console.log("[LinkAmazonPage] CSRF token set in sessionStorage & localStorage (and will be used as state):", csrfToken);
      
      if (isRelink && relinkAccountId) {
        sessionStorage.setItem('amazon_relink_info', JSON.stringify({ accountId: relinkAccountId, clientId: effectiveClientId }));
        localStorage.setItem('amazon_relink_info', JSON.stringify({ accountId: relinkAccountId, clientId: effectiveClientId })); 
      } else {
        sessionStorage.removeItem('amazon_relink_info'); 
        localStorage.removeItem('amazon_relink_info');
      }
    } catch (err) {
        console.error("[LinkAmazonPage] SessionStorage/LocalStorage write error:", err);
        const detailedStorageErrorMessage = `Failed to save session data for linking. This can happen if:
        1. You are using Incognito/Private browsing mode.
        2. Your browser's privacy settings (e.g., Brave Shields, Safari ITP, Firefox Enhanced Tracking Protection) are too restrictive.
        3. Browser extensions (ad-blockers, privacy tools) are interfering.
        4. Your browser's storage is full or corrupted.
        Please try:
        - Using a standard browser window (not Incognito/Private).
        - Temporarily adjusting browser privacy settings or disabling problematic extensions for this site.
        - Ensuring you complete the process in the SAME browser tab.
        If the issue persists, try a different browser or contact support.`;
        toast({ 
          title: "Critical Browser Storage Error", 
          description: detailedStorageErrorMessage, 
          variant: "destructive", 
          duration: 30000 
        });
        return; 
    }

    setLoading(true); 

    if (document.visibilityState !== "visible") {
      toast({
        title: "Action Required",
        description: "Please switch back to this tab to complete the Amazon linking. The link will open shortly.",
        variant: "default",
        className: "bg-yellow-500 text-black",
        duration: 7000
      });
    }

    const appPreviewUrl = window.location.origin; 
    const redirectUri = `${appPreviewUrl}/amazon-callback`;
    const scope = 'advertising::campaign_management profile'; 
    const encodedState = encodeURIComponent(csrfToken);
    
    if (!encodedState) {
      console.error("[LinkAmazonPage] CRITICAL: Encoded CSRF token (state) is empty.");
      toast({ title: "Internal Error", description: "Failed to prepare secure state for linking. Please try again or contact support.", variant: "destructive" });
      setLoading(false);
      return;
    }
      
    const amazonAuthUrl = `https://www.amazon.com/ap/oa?client_id=${effectiveClientId}&scope=${encodeURIComponent(scope)}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodedState}`;
    
    console.log("[LinkAmazonPage] Redirecting to Amazon. CSRF token (as state):", csrfToken, "URL:", amazonAuthUrl);
    
    setTimeout(() => {
      try {
        window.location.href = amazonAuthUrl;
      } catch (error) {
          console.error("[LinkAmazonPage] Error during redirect initiation:", error);
          toast({
              title: "Redirect Error",
              description: error.message || "Could not redirect to Amazon. Check network and try again.",
              variant: "destructive",
          });
          setLoading(false); 
      }
    }, 150);
  };

  const handleUnlinkAllAccounts = async () => {
    if (isUnlinkingAll) return;
    setIsUnlinkingAll(true);
    if (!user) {
      toast({ title: "Not Authenticated", description: "Please log in.", variant: "destructive" });
      setIsUnlinkingAll(false);
      return;
    }

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        toast({ title: "Authentication Error", description: "Your session is invalid. Please log in again.", variant: "destructive" });
        setIsUnlinkingAll(false);
        return;
      }
      const accessToken = sessionData.session.access_token;

      const { data, error } = await supabase.functions.invoke('unlink-all-amazon-accounts', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (error) throw error;

      if (data.success) {
        toast({ title: "All Accounts Unlinked", description: data.message || "All Amazon accounts successfully unlinked.", variant: "default", className: "bg-red-600 text-white" });
        fetchLinkedAccounts(); 
      } else {
        toast({ title: "Unlink All Failed", description: data.error || "Could not unlink all accounts.", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error unlinking all accounts:", error);
      const errorMessage = error.context?.message || error.message || "An unknown error occurred.";
      toast({ title: "Unlink All Error", description: `Failed: ${errorMessage}`, variant: "destructive" });
    } finally {
      setIsUnlinkingAll(false);
    }
  };
  
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const errorParam = params.get('error');
    const errorDescriptionParam = params.get('error_description');

    if (errorParam && window.location.pathname.startsWith('/link-amazon') && !location.pathname.startsWith('/amazon-callback')) {
        console.warn("[LinkAmazonPage] Amazon auth error on /link-amazon (not callback):", { errorParam, errorDescriptionParam });
         toast({
            title: `Amazon Link ${errorParam === 'access_denied' ? 'Denied by User' : 'Failed'}`,
            description: errorDescriptionParam || "An error occurred during Amazon linking. Please try again.",
            variant: "destructive",
          });
          try {
            sessionStorage.removeItem('amazon_oauth_csrf_token');
            localStorage.removeItem('amazon_oauth_csrf_token');
            sessionStorage.removeItem('amazon_relink_info');
            localStorage.removeItem('amazon_relink_info');
          } catch (e) {
            console.warn("[LinkAmazonPage] Failed to clear sessionStorage/localStorage on Amazon error:", e);
          }
          window.history.replaceState({}, document.title, "/link-amazon"); 
    }
  }, [location.search, location.pathname, toast]);


  return (
    <motion.div 
      className="space-y-10"
      initial="initial"
      animate="animate"
      variants={pageVariants}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-purple-600/20 rounded-lg border border-purple-500/30">
            <Link2 size={32} className="text-purple-400" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-100">
              {accountIdToRelink ? "Re-link Amazon Account" : "Manage KDP Accounts"}
            </h1>
            <p className="text-slate-400 text-sm mt-1">Connect and manage your Amazon Advertising profiles.</p>
          </div>
        </div>
      </div>

      <Card className="bg-slate-800/70 border-slate-700/50 shadow-xl glassmorphism-card">
        <CardHeader>
          <CardTitle className="text-xl text-slate-100">
            {accountIdToRelink 
              ? `Re-authorize Robotads for ${linkedAccounts.find(acc => acc.id === accountIdToRelink)?.name || 'this account'}` 
              : "Connect a New Amazon Advertising Profile"}
          </CardTitle>
          <CardDescription className="text-slate-400 pt-1">
            {accountIdToRelink
              ? "We need to re-establish the connection with your Amazon Advertising account. Click below to re-authorize."
              : "Link your Amazon Advertising account to start optimizing. You'll be redirected to Amazon to authorize."
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button 
              onClick={() => handleLinkAmazonAccount(!!accountIdToRelink, client_id_for_relink, accountIdToRelink)} 
              disabled={loading || !user || isUnlinkingAll}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-lg py-3 px-6 shadow-lg disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Connecting...
                </>
              ) : accountIdToRelink ? (
                <>
                  <RefreshCcw className="mr-2 h-5 w-5" /> Re-link Account
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-5 w-5" /> Link New Amazon Account
                </>
              )}
            </Button>
          </motion.div>
          {!user && <p className="text-red-400 text-sm mt-2 text-center">Please log in to link accounts.</p>}
          
          <div className="pt-2 text-center">
            <Button variant="link" onClick={() => setShowTechDetails(!showTechDetails)} className="text-xs text-slate-500 hover:text-slate-400">
              {showTechDetails ? 'Hide' : 'Show'} Technical Details <Info size={12} className="ml-1 inline"/>
            </Button>
          </div>

          {showTechDetails && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="text-xs text-slate-500 mt-2 p-3 bg-slate-900/50 rounded-md border border-slate-700"
            >
              <p>Amazon Client ID: <code className="bg-slate-700 p-0.5 rounded text-purple-300">{(client_id_for_relink || AMAZON_CLIENT_ID_FROM_ENV).substring(0,20)}...</code></p>
              <p>Redirect URI: <code className="bg-slate-700 p-0.5 rounded text-purple-300">{`${window.location.origin}/amazon-callback`}</code></p>
              <p className="mt-1">Ensure this Redirect URI is an "Allowed Return URL" in your Amazon Developer Console for the Client ID above.</p>
              <p className="mt-1">Important: Complete authorization in the <span className="font-semibold text-amber-400">same browser tab</span>. Do not open new tabs/windows.</p>
            </motion.div>
          )}

        </CardContent>
         {accountIdToRelink && (
            <CardFooter className="justify-center">
                <Button variant="outline" onClick={() => navigate('/link-amazon', { replace: true, state: {} })} className="text-slate-300 border-slate-600 hover:bg-slate-700">Cancel Re-link</Button>
            </CardFooter>
        )}
      </Card>

      {!accountIdToRelink && user && (
        <LinkedAccountsList
          user={user}
          linkedAccounts={linkedAccounts}
          isFetchingAccounts={isFetchingAccounts}
          fetchLinkedAccounts={fetchLinkedAccounts}
        />
      )}

      {!accountIdToRelink && linkedAccounts.length > 0 && user && (
        <Card className="bg-slate-800/70 border-slate-700/50 shadow-xl glassmorphism-card mt-8">
          <CardHeader>
            <CardTitle className="text-red-400 flex items-center"><ShieldAlert size={20} className="mr-2"/>Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-400 mb-4">Unlinking all accounts is a permanent action and will remove all associated data from Robotads.</p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive"
                  disabled={isUnlinkingAll || loading || !user}
                  className="w-full sm:w-auto bg-red-700 hover:bg-red-800 text-white text-md py-2 px-6 shadow-lg disabled:opacity-60"
                >
                  {isUnlinkingAll ? (
                    <> <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Unlinking All... </>
                  ) : (
                    <> <Trash2 className="mr-2 h-5 w-5" /> Unlink All Amazon Accounts </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-slate-800 border-slate-700 text-slate-100">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center text-red-400">
                    <ShieldAlert size={24} className="mr-2" />
                    Confirm: Unlink All Accounts?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-slate-400">
                    This will permanently remove Robotads' access to ALL your linked Amazon Advertising profiles and delete their associated data from our system (campaigns, rules, logs, etc.). This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="border-slate-600 hover:bg-slate-700 text-slate-300">Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleUnlinkAllAccounts}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Yes, Unlink All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
};

export default LinkAmazonPage;