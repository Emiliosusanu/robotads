
import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { AMAZON_CLIENT_ID_FROM_ENV } from '@/config/amazonConstants';
import { pageStatusMap, DETAILED_BROWSER_STORAGE_ERROR_MSG, clearCsrfAndRelinkInfo as clearStorage } from './utils';

export const useAmazonAuthCallback = () => {
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

  const fetchCurrentUser = useCallback(async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.error("[useAmazonAuthCallback] Error fetching current user:", error);
      toast({ title: "Authentication Error", description: "Could not verify your session. Please log in again.", variant: "destructive" });
      navigate('/auth', { replace: true });
      return null;
    }
    if (!user) {
      console.warn("[useAmazonAuthCallback] No active user session. Redirecting to login.");
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
    console.log("[useAmazonAuthCallback] processInitialCallback: Attempting. Full URL:", window.location.href);
    
    const user = await fetchCurrentUser();
    if (!user) {
      console.warn("[useAmazonAuthCallback] processInitialCallback: No user found, aborting.");
      return;
    }

    const authCode = authCodeRef.current;
    const queryParams = new URLSearchParams(window.location.search);
    const returnedStateFromUrl = queryParams.get('state');
    const scope = queryParams.get('scope');
    
    if (!returnedStateFromUrl) {
      const errorParam = queryParams.get('error');
      const errorDescriptionParam = queryParams.get('error_description');
      let detailedError = 'Critical: State parameter (CSRF token) missing from Amazon response.';
      if (errorParam) detailedError = `Amazon error: ${errorDescriptionParam || errorParam}. State parameter not returned.`;
      setErrorDetails(detailedError);
      setPageStatus(pageStatusMap.ERROR);
      toast({ variant: "destructive", title: "Amazon Link Security Error", description: detailedError, duration: 15000 });
      clearStorage();
      setTimeout(() => navigate("/link-amazon", { state: { error: "state_missing_from_amazon" }, replace: true }), 5000);
      return;
    }
    
    if (!authCode) {
      const errorParam = queryParams.get('error');
      const errorDescriptionParam = queryParams.get('error_description');
      let detailedError = 'Authorization code missing from Amazon response.';
      if (errorParam === 'access_denied') detailedError = 'Access to Amazon Advertising was denied.';
      else if (errorDescriptionParam) detailedError = `Amazon error: ${errorDescriptionParam}`;
      setErrorDetails(detailedError);
      setPageStatus(pageStatusMap.ERROR);
      toast({ variant: "destructive", title: "Amazon Link Auth Error", description: detailedError, duration: 10000 });
      clearStorage();
      setTimeout(() => navigate("/link-amazon", { state: { error: "auth_code_missing_or_used" }, replace: true }), 5000);
      return;
    }

    let storedCsrfToken = sessionStorage.getItem('amazon_oauth_csrf_token') || localStorage.getItem('amazon_oauth_csrf_token');
    if (!storedCsrfToken) {
      setErrorDetails(DETAILED_BROWSER_STORAGE_ERROR_MSG);
      setPageStatus(pageStatusMap.ERROR);
      toast({ variant: "destructive", title: "Browser Storage Security Error", description: DETAILED_BROWSER_STORAGE_ERROR_MSG, duration: 30000 });
      setTimeout(() => navigate("/link-amazon", { state: { error: "csrf_missing_from_storage_after_redirect" }, replace: true }), 5000);
      return;
    }
    
    if (returnedStateFromUrl !== storedCsrfToken) {
      const mismatchErrorMsg = 'Security Check Failed (CSRF token mismatch). Please try linking again.';
      setErrorDetails(mismatchErrorMsg);
      setPageStatus(pageStatusMap.ERROR);
      toast({ variant: "destructive", title: "Amazon Link Security Failure", description: mismatchErrorMsg, duration: 15000 });
      clearStorage();
      setTimeout(() => navigate("/link-amazon", { state: { error: "csrf_mismatch_after_redirect" }, replace: true }), 5000);
      return;
    }

    let relinkInfo = null;
    const storedRelinkInfoString = sessionStorage.getItem('amazon_relink_info') || localStorage.getItem('amazon_relink_info');
    if (storedRelinkInfoString) {
      try { relinkInfo = JSON.parse(storedRelinkInfoString); } catch (e) { console.warn("Could not parse relink info.", e); }
    }
    
    const redirectUriForTokenExchange = `${window.location.origin}/amazon-callback`;
    const clientIdForTokenExchange = relinkInfo?.clientId || AMAZON_CLIENT_ID_FROM_ENV;
    const accountIdToRelink = relinkInfo?.accountId || null;

    try {
      toast({ title: "Connecting to Amazon...", description: "Exchanging authorization code and fetching profiles." });
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) throw new Error("User session not found.");
      
      const { data: functionData, error: functionError } = await supabase.functions.invoke('amazon-token-exchange', {
        headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
        body: { code: authCode, scope, client_id_from_state: clientIdForTokenExchange, redirect_uri_from_state: redirectUriForTokenExchange, relink_account_id: accountIdToRelink, fetch_profiles_only: true },
      });
      authCodeRef.current = null;
      if (functionError) throw functionError;

      if (functionData?.success && functionData.availableProfiles && functionData.tokens) {
        setAvailableProfiles(functionData.availableProfiles);
        setTemporaryTokens(functionData.tokens);
        if (functionData.availableProfiles.length === 0) {
          setErrorDetails("No advertising profiles found for your Amazon account.");
          setPageStatus(pageStatusMap.ERROR);
        } else if (accountIdToRelink && functionData.linkedProfile) {
          setPageStatus(pageStatusMap.SUCCESS);
          setFinalLinkResult({ linkedProfiles: [functionData.linkedProfile] });
        } else {
          setPageStatus(pageStatusMap.SELECTING_PROFILES);
        }
      } else {
        throw new Error(functionData?.error || "Failed to fetch profiles or missing tokens.");
      }
    } catch (e) {
      const errorMsg = e.context?.message || e.message || "An unexpected error occurred.";
      setErrorDetails(`Error fetching profiles: ${errorMsg}`);
      setPageStatus(pageStatusMap.ERROR);
      toast({ variant: "destructive", title: "Profile Fetch Failed", description: errorMsg, duration: 10000 });
    } finally {
      clearStorage();
    }
  }, [navigate, toast, fetchCurrentUser]);

  useEffect(() => {
    if (hasProcessedCallbackRef.current) return;
    if (authCodeRef.current && pageStatus === pageStatusMap.PROCESSING_INITIAL_TOKEN && currentUser) {
      hasProcessedCallbackRef.current = true;
      processInitialCallback();
    }
  }, [pageStatus, currentUser, processInitialCallback]);

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

    const profilesToSubmit = availableProfiles.filter(p => selectedProfileIds.has(p.profileId.toString()));
    if (profilesToSubmit.length === 0) {
      toast({ title: "No Profiles Selected", variant: "destructive" });
      return;
    }

    for (const p of profilesToSubmit) {
      if (!p.profileId) {
        setErrorDetails("Critical error: A selected profile is missing its ID.");
        setPageStatus(pageStatusMap.ERROR); return;
      }
      if (!p.apiRegion && !p.countryCode) {
        setErrorDetails(`Critical error: Profile '${p.accountInfo?.name || p.profileId}' is missing region information.`);
        setPageStatus(pageStatusMap.ERROR); return;
      }
    }

    if (!temporaryTokens) {
      setErrorDetails("Critical: Temporary tokens missing. Session issue.");
      setPageStatus(pageStatusMap.ERROR); return;
    }
    
    const finalClientId = relinkAccountId ? (temporaryTokens?.relinkInfo?.clientId || AMAZON_CLIENT_ID_FROM_ENV) : AMAZON_CLIENT_ID_FROM_ENV;
    const finalRedirectUri = `${window.location.origin}/amazon-callback`;
    const finalRelinkAccountId = relinkAccountId || (temporaryTokens?.relinkInfo?.accountId);

    setIsFinalizing(true);
    setPageStatus(pageStatusMap.PROCESSING_FINAL_LINK);
    toast({ title: "Finalizing Connection..." });

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) throw new Error("User session not found.");

      const { data: functionData, error: functionError } = await supabase.functions.invoke('finalize-amazon-link-with-profiles', {
        headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
        body: { selected_profile_ids: profilesToSubmit, tokens: temporaryTokens, client_id_from_state: finalClientId, redirect_uri_from_state: finalRedirectUri, relink_account_id: finalRelinkAccountId, user_id: user.id },
      });
      if (functionError) throw functionError;
      setFinalLinkResult(functionData);

      if (functionData?.success && functionData.linkedProfiles) {
        const allAlreadyLinked = functionData.linkedProfiles.every(p => p.alreadyLinked && p.success);
        const numTotalSuccessful = functionData.linkedProfiles.filter(p => p.success).length;
        if (allAlreadyLinked && functionData.linkedProfiles.length > 0) {
          setInfoMessage(`All ${functionData.linkedProfiles.length} selected profile(s) were already linked.`);
          setPageStatus(pageStatusMap.INFO);
        } else if (numTotalSuccessful > 0) {
          setPageStatus(pageStatusMap.SUCCESS);
        } else {
          setErrorDetails(functionData.linkedProfiles.find(p => !p.success)?.error || "Some profiles failed to link.");
          setPageStatus(pageStatusMap.ERROR);
        }
      } else {
        throw new Error(functionData?.error || "Unknown error during final linking.");
      }
    } catch (e) {
      const errorMsg = e.context?.message || e.message || "An unexpected error occurred.";
      setErrorDetails(`Error finalizing link: ${errorMsg}`);
      setPageStatus(pageStatusMap.ERROR);
      toast({ variant: "destructive", title: "Final Link Failed", description: errorMsg });
    } finally {
      setTemporaryTokens(null);
      setIsFinalizing(false);
    }
  };
  
  useEffect(() => {
    if (pageStatus !== pageStatusMap.PROCESSING_INITIAL_TOKEN && window.location.search) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [pageStatus]);

  return {
    pageStatus,
    errorDetails,
    availableProfiles,
    selectedProfileIds,
    finalLinkResult,
    infoMessage,
    isFinalizing,
    handleProfileSelection,
    handleFinalizeLink,
  };
};

