import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { AMAZON_CLIENT_ID_FROM_ENV } from '@/config/amazonConstants';

import InitialProcessingView from '@/components/amazon/callback/InitialProcessingView';
import ProfileSelectorView from '@/components/amazon/callback/ProfileSelectorView';
import ResultView from '@/components/amazon/callback/ResultView';

const pageStatusMap = {
  PROCESSING_INITIAL_TOKEN: 'processing_initial_token',
  SELECTING_PROFILES: 'selecting_profiles',
  PROCESSING_FINAL_LINK: 'processing_final_link',
  SUCCESS: 'success',
  ERROR: 'error',
  INFO: 'info',
};

const AmazonCallbackPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [pageStatus, setPageStatus] = useState(pageStatusMap.PROCESSING_INITIAL_TOKEN);
  const [errorDetails, setErrorDetails] = useState('');
  const [availableProfiles, setAvailableProfiles] = useState([]);
  const [selectedProfileIds, setSelectedProfileIds] = useState(new Set());
  const [temporaryTokens, setTemporaryTokens] = useState(null);
  const [finalLinkResult, setFinalLinkResult] = useState(null);
  const [infoMessage, setInfoMessage] = useState('');
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const hasProcessedCallbackRef = useRef(false);
  const authCodeRef = useRef(new URLSearchParams(window.location.search).get("code"));


  const detailedBrowserStorageErrorMsg = `Browser Storage Error: Security token not found after redirect. This often happens if:
  1. You opened the Amazon authorization link in a new tab/window.
  2. Your browser session expired due to inactivity.
  3. Browser settings (e.g., Brave Shields, Safari ITP, Firefox Enhanced Tracking Protection) or extensions (ad-blockers, privacy tools) are restricting storage.
  4. You are using Incognito/Private browsing mode.
  Please try linking again, ensuring you:
  - Complete the process in the SAME browser tab.
  - Avoid using browser back/forward buttons during linking.
  - Temporarily adjust browser privacy settings or disable problematic extensions for this site.
  - Avoid Incognito/Private mode for linking.
  If the issue persists, try a different browser or contact support.`;

  const clearCsrfTokens = () => {
    try {
      sessionStorage.removeItem('amazon_oauth_csrf_token');
      localStorage.removeItem('amazon_oauth_csrf_token');
      sessionStorage.removeItem('amazon_relink_info');
      localStorage.removeItem('amazon_relink_info');
      console.log("[AmazonCallbackPage] Cleared CSRF tokens from sessionStorage and localStorage.");
    } catch (e) {
      console.warn("[AmazonCallbackPage] Failed to clear CSRF tokens from storage:", e);
    }
  };

  const fetchCurrentUser = useCallback(async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.error("[AmazonCallbackPage] Error fetching current user:", error);
      toast({ title: "Authentication Error", description: "Could not verify your session. Please log in again.", variant: "destructive" });
      navigate('/auth', { replace: true });
      return null;
    }
    if (!user) {
      console.warn("[AmazonCallbackPage] No active user session. Redirecting to login.");
      toast({ title: "Session Expired", description: "Your session has expired. Please log in again.", variant: "destructive" });
      navigate('/auth', { replace: true });
      return null;
    }
    setCurrentUser(user);
    return user;
  }, [navigate, toast]);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);


  const processInitialCallback = useCallback(async () => {
    console.log("[AmazonCallbackPage] processInitialCallback: Attempting. Full URL:", window.location.href);
    
    const user = await fetchCurrentUser(); 
    if (!user) {
      console.warn("[AmazonCallbackPage] processInitialCallback: No user found, aborting.");
      return;
    }

    const authCode = authCodeRef.current; 
    const queryParams = new URLSearchParams(window.location.search);
    const returnedStateFromUrl = queryParams.get('state'); 
    const scope = queryParams.get('scope');
    
    console.log("[AmazonCallbackPage] processInitialCallback: Auth code from ref:", authCode);

    if (!returnedStateFromUrl) {
      const errorParam = queryParams.get('error');
      const errorDescriptionParam = queryParams.get('error_description');
      let detailedError = 'Critical: State parameter (CSRF token) missing from Amazon response. This is required for security. Please ensure you complete the authorization in the same browser tab and try again.';
      if (errorParam) detailedError = `Amazon error: ${errorDescriptionParam || errorParam}. The State parameter was not returned by Amazon.`;
      
      console.error("[AmazonCallbackPage] FATAL - State parameter missing from Amazon response. Query:", location.search);
      setErrorDetails(detailedError);
      setPageStatus(pageStatusMap.ERROR);
      toast({ variant: "destructive", title: "Amazon Link Security Error", description: detailedError, duration: 15000 });
      clearCsrfTokens();
      setTimeout(() => navigate("/link-amazon", { state: { error: "state_missing_from_amazon" }, replace: true }), 5000);
      return;
    }
    console.log("[AmazonCallbackPage] State returned from Amazon URL:", returnedStateFromUrl);
    
    if (!authCode) {
      const errorParam = queryParams.get('error');
      const errorDescriptionParam = queryParams.get('error_description');
      let detailedError = 'Authorization code missing from Amazon response. Cannot proceed.';
      if (errorParam === 'access_denied') detailedError = 'Access to Amazon Advertising was denied by the user. Please approve access to link your account.';
      else if (errorDescriptionParam) detailedError = `Amazon error: ${errorDescriptionParam} (Code: ${errorParam || 'N/A'})`;
      else if (errorParam) detailedError = `Amazon error code: ${errorParam}.`;
      
      console.error("[AmazonCallbackPage] Auth code missing. Error:", {errorParam, errorDescriptionParam});
      setErrorDetails(detailedError);
      setPageStatus(pageStatusMap.ERROR);
      toast({ variant: "destructive", title: "Amazon Link Auth Error", description: detailedError, duration: 10000 });
      clearCsrfTokens();
      setTimeout(() => navigate("/link-amazon", { state: { error: "auth_code_missing_or_used" }, replace: true }), 5000);
      return;
    }

    let storedCsrfToken;
    try {
      storedCsrfToken = sessionStorage.getItem('amazon_oauth_csrf_token');
      if (!storedCsrfToken) {
        console.warn("[AmazonCallbackPage] CSRF token not found in sessionStorage, trying localStorage as fallback.");
        storedCsrfToken = localStorage.getItem('amazon_oauth_csrf_token');
      }
      console.log("[AmazonCallbackPage] CSRF token retrieved from storage (session/local):", storedCsrfToken);

      if (!storedCsrfToken) {
        console.error("[AmazonCallbackPage] FATAL - CSRF token ('amazon_oauth_csrf_token') missing from both sessionStorage and localStorage. This is a 'Browser Storage Error'.");
        setErrorDetails(detailedBrowserStorageErrorMsg);
        setPageStatus(pageStatusMap.ERROR);
        toast({ variant: "destructive", title: "Browser Storage Security Error", description: detailedBrowserStorageErrorMsg, duration: 30000 });
        setTimeout(() => navigate("/link-amazon", { state: { error: "csrf_missing_from_storage_after_redirect" }, replace: true }), 5000);
        return;
      }
    } catch (e) {
      console.error("[AmazonCallbackPage] Error reading sessionStorage/localStorage for CSRF token:", e);
      const storageAccessErrorMsg = `Browser Storage Access Error: ${e.message}. Could not verify request security. Ensure your browser allows session storage (cookies and site data) and is not in a mode that restricts it (e.g., private browsing).`;
      setErrorDetails(storageAccessErrorMsg);
      setPageStatus(pageStatusMap.ERROR);
      toast({ variant: "destructive", title: "Browser Storage Access Error", description: storageAccessErrorMsg, duration: 15000 });
      setTimeout(() => navigate("/link-amazon", { state: { error: "storage_access_error" }, replace: true }), 5000);
      return;
    }
    
    if (returnedStateFromUrl !== storedCsrfToken) {
      console.error("[AmazonCallbackPage] FATAL - CSRF token mismatch.", { returnedStateFromUrl, storedCsrfToken });
      const mismatchErrorMsg = 'Security Check Failed (CSRF token mismatch). Your session may be invalid or compromised. This can also happen if you use browser back/forward buttons during linking. Please try linking again from the start.';
      setErrorDetails(mismatchErrorMsg);
      setPageStatus(pageStatusMap.ERROR);
      toast({ variant: "destructive", title: "Amazon Link Security Failure", description: mismatchErrorMsg, duration: 15000 });
      clearCsrfTokens();
      setTimeout(() => navigate("/link-amazon", { state: { error: "csrf_mismatch_after_redirect" }, replace: true }), 5000);
      return;
    }

    console.log("[AmazonCallbackPage] CSRF security check passed (state from URL matches token from storage).");
    
    let relinkInfo = null;
    let storedRelinkInfoString = sessionStorage.getItem('amazon_relink_info');
    if (!storedRelinkInfoString) {
        storedRelinkInfoString = localStorage.getItem('amazon_relink_info');
    }

    if (storedRelinkInfoString) {
      try { relinkInfo = JSON.parse(storedRelinkInfoString); } 
      catch (e) { console.warn("[AmazonCallbackPage] Could not parse relink info.", e); }
    }
    
    const redirectUriForTokenExchange = `${window.location.origin}/amazon-callback`;
    const clientIdForTokenExchange = relinkInfo?.clientId || AMAZON_CLIENT_ID_FROM_ENV;
    const accountIdToRelink = relinkInfo?.accountId || null;

    console.log("[AmazonCallbackPage] Preparing for initial token exchange with authCode:", authCode ? "present" : "missing", { redirectUriForTokenExchange, clientIdForTokenExchange, accountIdToRelink });

    try {
      toast({ title: "Connecting to Amazon...", description: "Exchanging authorization code and fetching profiles." });
      
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        throw new Error("User session not found or invalid. Please log in again.");
      }
      const accessToken = sessionData.session.access_token;

      const { data: functionData, error: functionError } = await supabase.functions.invoke('amazon-token-exchange', {
        headers: { Authorization: `Bearer ${accessToken}` },
        body: { 
          code: authCode, 
          scope: scope,
          client_id_from_state: clientIdForTokenExchange, 
          redirect_uri_from_state: redirectUriForTokenExchange, 
          relink_account_id: accountIdToRelink,
          fetch_profiles_only: true 
        },
      });

      authCodeRef.current = null; 

      if (functionError) throw functionError;

      console.log("[AmazonCallbackPage] Response from 'amazon-token-exchange' (fetch_profiles_only):", functionData);

      if (functionData && functionData.success && functionData.availableProfiles && functionData.tokens) {
        setAvailableProfiles(functionData.availableProfiles);
        setTemporaryTokens(functionData.tokens); 
        
        if (functionData.availableProfiles.length === 0) {
          setErrorDetails("No advertising profiles found for your Amazon account. Ensure you have an active Amazon Advertising account with at least one profile.");
          setPageStatus(pageStatusMap.ERROR);
          toast({variant: "destructive", title: "No Profiles Found", description: "No advertising profiles were found for this Amazon account.", duration: 10000});
        } else if (accountIdToRelink && functionData.linkedProfile) { 
            setPageStatus(pageStatusMap.SUCCESS);
            setFinalLinkResult({ linkedProfiles: [functionData.linkedProfile] });
            toast({ variant: "default", title: "Account Re-linked", description: `Successfully re-linked ${functionData.linkedProfile.name}.`, className: "bg-green-500 text-white" });
        } else {
            console.log("[AmazonCallbackPage] Transitioning to profile selection for user confirmation.");
            setPageStatus(pageStatusMap.SELECTING_PROFILES);
        }
      } else {
        throw new Error(functionData?.error || "Failed to fetch profiles or missing tokens from server.");
      }
    } catch (e) {
      console.error('[AmazonCallbackPage] Error during initial token exchange or profile fetch:', e);
      const errorMsg = e.context?.message || e.message || "An unexpected error occurred.";
      setErrorDetails(`Error fetching profiles: ${errorMsg}`);
      setPageStatus(pageStatusMap.ERROR);
      toast({ variant: "destructive", title: "Profile Fetch Failed", description: errorMsg, duration: 10000 });
    } finally {
      clearCsrfTokens(); 
    }
  }, [navigate, toast, detailedBrowserStorageErrorMsg, fetchCurrentUser]); 

  useEffect(() => {
    if (pageStatus !== pageStatusMap.PROCESSING_INITIAL_TOKEN && location.search) {
      window.history.replaceState({}, document.title, location.pathname);
    }
  }, [pageStatus, location.search, location.pathname]);

  useEffect(() => {
    if (hasProcessedCallbackRef.current) {
      console.log("[AmazonCallbackPage] processInitialCallback already run or processing. Skipping.");
      return;
    }
    
    if (authCodeRef.current && pageStatus === pageStatusMap.PROCESSING_INITIAL_TOKEN && currentUser) {
      console.log("[AmazonCallbackPage] Conditions met, calling processInitialCallback.");
      hasProcessedCallbackRef.current = true; 
      processInitialCallback();
    } else {
      console.log("[AmazonCallbackPage] Conditions for processInitialCallback not met or already run:", { authCodeExists: !!authCodeRef.current, pageStatus, currentUserExists: !!currentUser, hasProcessed: hasProcessedCallbackRef.current });
      if (!authCodeRef.current && pageStatus === pageStatusMap.PROCESSING_INITIAL_TOKEN && !errorDetails) {
        console.log("[AmazonCallbackPage] No auth code found in URL on initial load. Staying in processing state or error state if already set.");
      }
    }
  }, [pageStatus, currentUser, processInitialCallback, errorDetails]);


  const handleProfileSelection = (profileId) => {
    setSelectedProfileIds(prev => {
      const newSet = new Set(prev);
      const profileIdStr = profileId.toString();
      if (newSet.has(profileIdStr)) newSet.delete(profileIdStr);
      else newSet.add(profileIdStr);
      return newSet;
    });
  };

  const handleFinalizeLink = async (relinkAccountId = null) => {
    if (isFinalizing) return;

    const user = await fetchCurrentUser();
    if (!user) return;

    const profilesToSubmit = availableProfiles.filter(p =>
      selectedProfileIds.has(p.profileId.toString())
    );

    if (profilesToSubmit.length === 0) {
      toast({ title: "No Profiles Selected", description: "Please select at least one profile.", variant: "destructive" });
      return;
    }

    for (const p of profilesToSubmit) {
      if (!p.profileId) {
        console.error("[AmazonCallbackPage] FATAL - Missing profileId from a selected profile object:", p);
        const profileErrorMsg = "Critical error: A selected profile is missing its ID, which is necessary for linking. Please try the linking process again. If the issue persists, contact support.";
        setErrorDetails(profileErrorMsg);
        setPageStatus(pageStatusMap.ERROR);
        toast({ variant: "destructive", title: "Profile Data Error", description: profileErrorMsg, duration: 15000 });
        return;
      }
      if (!p.apiRegion && !p.countryCode) {
         console.error("[AmazonCallbackPage] FATAL - Profile missing apiRegion and countryCode:", p);
         const regionErrorMsg = `Critical error: Profile '${p.accountInfo?.name || p.profileId}' is missing region information. Cannot link. Please contact support or try re-linking.`;
         setErrorDetails(regionErrorMsg);
         setPageStatus(pageStatusMap.ERROR);
         toast({ variant: "destructive", title: "Profile Region Error", description: regionErrorMsg, duration: 15000 });
         return;
      }
    }


    if (!temporaryTokens) {
      setErrorDetails("Critical: Temporary tokens missing. Cannot finalize. Session issue. Please restart the linking process.");
      setPageStatus(pageStatusMap.ERROR);
      toast({variant: "destructive", title: "Internal Error", description: "Session tokens lost. Please try linking again from the start."});
      return;
    }
    
    const finalClientId = relinkAccountId ? (temporaryTokens?.relinkInfo?.clientId || AMAZON_CLIENT_ID_FROM_ENV) : AMAZON_CLIENT_ID_FROM_ENV;
    const finalRedirectUri = `${window.location.origin}/amazon-callback`;
    const finalRelinkAccountId = relinkAccountId || (temporaryTokens?.relinkInfo?.accountId);


    setIsFinalizing(true);
    setPageStatus(pageStatusMap.PROCESSING_FINAL_LINK);
    toast({ title: "Finalizing Connection...", description: `Linking ${profilesToSubmit.length} profile(s).` });

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        throw new Error("User session not found or invalid. Please log in again.");
      }
      const accessToken = sessionData.session.access_token;

      const { data: functionData, error: functionError } = await supabase.functions.invoke('finalize-amazon-link-with-profiles', {
        headers: { Authorization: `Bearer ${accessToken}` },
        body: { 
          selected_profile_ids: profilesToSubmit, 
          tokens: temporaryTokens, 
          client_id_from_state: finalClientId, 
          redirect_uri_from_state: finalRedirectUri, 
          relink_account_id: finalRelinkAccountId,
          user_id: user.id 
        },
      });

      if (functionError) throw functionError;
      
      setFinalLinkResult(functionData); 

      if (functionData && functionData.success && functionData.linkedProfiles) {
        const linkedProfilesResults = functionData.linkedProfiles;
        const allAlreadyLinked = linkedProfilesResults.every(p => p.alreadyLinked && p.success);
        const numTotalSuccessful = linkedProfilesResults.filter(p => p.success).length;

        if (allAlreadyLinked && linkedProfilesResults.length > 0) {
          setInfoMessage(`All ${linkedProfilesResults.length} selected profile(s) were already linked and active.`);
          setPageStatus(pageStatusMap.INFO);
        } else if (numTotalSuccessful > 0) {
          setPageStatus(pageStatusMap.SUCCESS);
        } else {
          const firstError = linkedProfilesResults.find(p => !p.success)?.error || "Some profiles failed to link.";
          setErrorDetails(firstError);
          setPageStatus(pageStatusMap.ERROR);
        }
      } else {
         throw new Error(functionData?.error || "Unknown error during final linking.");
      }
    } catch (e) {
      const errorMsg = e.context?.message || e.message || "An unexpected error occurred.";
      setErrorDetails(`Error finalizing link: ${errorMsg}`);
      setPageStatus(pageStatusMap.ERROR);
      toast({ variant: "destructive", title: "Final Link Failed", description: errorMsg, duration: 10000 });
    } finally {
      setTemporaryTokens(null); 
      setIsFinalizing(false);
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  const renderContent = () => {
    switch (pageStatus) {
      case pageStatusMap.PROCESSING_INITIAL_TOKEN:
        return <InitialProcessingView title="Connecting to Amazon..." description="Securely fetching available advertising profiles. Please wait." />;
      case pageStatusMap.SELECTING_PROFILES:
        return <ProfileSelectorView availableProfiles={availableProfiles} selectedProfiles={selectedProfileIds} onProfileSelection={handleProfileSelection} onFinalizeLink={() => handleFinalizeLink()} isFinalizing={isFinalizing} />;
      case pageStatusMap.PROCESSING_FINAL_LINK:
        return <InitialProcessingView title="Finalizing Connection..." description="Securely linking selected Amazon Advertising profile(s)." />;
      case pageStatusMap.SUCCESS:
        return <ResultView status="success" title="Connection Processed!" linkedProfilesData={finalLinkResult?.linkedProfiles} />;
      case pageStatusMap.INFO:
        return <ResultView status="info" title="Profiles Already Linked" message={infoMessage} linkedProfilesData={finalLinkResult?.linkedProfiles} />;
      case pageStatusMap.ERROR:
        return <ResultView status="error" title="Linking Failed" details={errorDetails} />;
      default:
        return <InitialProcessingView title="Processing..." description="Please wait." />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <motion.div 
        className="bg-white shadow-2xl rounded-xl p-8 md:p-12 w-full max-w-2xl text-slate-800"
        variants={cardVariants}
        initial="hidden"
        animate="visible"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={pageStatus}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </motion.div>
      <p className="text-slate-400 mt-8 text-sm">Robotads PPC Optimizer</p>
    </div>
  );
};

export default AmazonCallbackPage;
