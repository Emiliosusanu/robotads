
import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Zap, Loader2, RefreshCcw, DownloadCloud, Trash2, Eye, ShieldAlert, ServerCrash, WifiOff, KeyRound, AlertCircle, Briefcase, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useNavigate } from 'react-router-dom';

const itemVariants = {
  initial: { opacity: 0, y: -10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
  exit: { opacity: 0, y: 10, transition: { duration: 0.2, ease: "easeIn" } }
};

const getStatusBadge = (status) => {
  switch (status) {
    case 'active':
      return { text: 'Active', className: 'bg-green-500/20 text-green-300', icon: <Zap size={12} className="mr-1"/> };
    case 'reauth_required':
      return { text: 'Re-authentication Required', className: 'bg-red-500/20 text-red-300', icon: <KeyRound size={12} className="mr-1"/> };
    case 'pending_profile':
      return { text: 'Pending Profile Selection', className: 'bg-orange-500/20 text-orange-300', icon: <Briefcase size={12} className="mr-1"/> };
    case 'error_no_profile':
      return { text: 'Profile ID Missing', className: 'bg-red-700/30 text-red-200', icon: <AlertCircle size={12} className="mr-1"/> };
    case 'error_profile_fetch':
      return { text: 'Profile Fetch Error', className: 'bg-red-700/30 text-red-200', icon: <ServerCrash size={12} className="mr-1"/> };
    case 'error_rate_limit':
       return { text: 'Rate Limit Hit', className: 'bg-yellow-600/30 text-yellow-200', icon: <WifiOff size={12} className="mr-1"/> };
    case 'error_sync':
        return { text: 'Sync Error', className: 'bg-red-600/30 text-red-200', icon: <ServerCrash size={12} className="mr-1"/> };
    case 'error_config':
        return { text: 'Configuration Error', className: 'bg-red-700/40 text-red-100', icon: <ShieldAlert size={12} className="mr-1"/> };
    default:
      return { text: status?.replace(/_/g, ' ') || 'Unknown', className: 'bg-slate-500/20 text-slate-300', icon: <AlertCircle size={12} className="mr-1"/> };
  }
};


const LinkedAccountsList = ({ user, linkedAccounts, isFetchingAccounts, fetchLinkedAccounts }) => {
  const [syncingAccountId, setSyncingAccountId] = useState(null);
  const [unlinkingAccountId, setUnlinkingAccountId] = useState(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSyncData = async (accountId) => {
    if (!user) {
      toast({ title: "Not authenticated", description: "Please login to sync data.", variant: "destructive" });
      return;
    }
    setSyncingAccountId(accountId);
    toast({ title: "Sync Initiated", description: "Fetching latest data from Amazon. This may take a few minutes." });
    try {
      const { data: funcData, error: funcError } = await supabase.functions.invoke('fetch-amazon-data', {
        body: { user_id: user.id, account_id: accountId, action: 'sync_all_data' }, 
      });

      if (funcError) throw funcError;
      
      const message = funcData?.message || "Data fetching process update.";
      const variant = funcData?.success ? "default" : "destructive";
      toast({ title: funcData?.success ? "Sync Update" : "Sync Info", description: message, variant: variant, className: funcData?.success ? "bg-green-600 text-white" : "" });
      
      fetchLinkedAccounts();

    } catch (error) {
      console.error("Sync Error Raw:", error);
      const errorMessage = error.context?.message || error.message || 'Unknown error during sync.';
      toast({ title: "Sync Error", description: `Failed to sync data: ${errorMessage}`, variant: "destructive" });
       if (error.context?.status === 401 || error.message.includes("reauth_required") || errorMessage.includes("reauth_required")) {
         fetchLinkedAccounts(); 
      }
    } finally {
      setSyncingAccountId(null);
    }
  };

  const handleUnlinkAccount = async (accountId) => {
    if (!user) {
      toast({ title: "Not authenticated", description: "Please login to unlink an account.", variant: "destructive" });
      return;
    }
    setUnlinkingAccountId(accountId);
    try {
      const { data: funcData, error: funcError } = await supabase.functions.invoke('delete-amazon-account', {
        body: { user_id: user.id, account_id: accountId },
      });

      if (funcError) throw funcError;

      if (funcData.success) {
        toast({ title: "Account Unlinked", description: funcData.message, variant: "default", className: "bg-red-600 text-white" });
        fetchLinkedAccounts(); 
      } else {
        toast({ title: "Unlink Failed", description: funcData.error || "Could not unlink the account.", variant: "destructive" });
      }
    } catch (error) {
      const errorMessage = error.context?.message || error.message || 'Unknown error during unlinking.';
      toast({ title: "Unlink Error", description: `Failed to unlink account: ${errorMessage}`, variant: "destructive" });
    } finally {
      setUnlinkingAccountId(null);
    }
  };

  if (isFetchingAccounts) {
    return (
      <div className="flex justify-center items-center p-8 mt-6">
        <Loader2 className="h-10 w-10 animate-spin text-purple-400" />
      </div>
    );
  }

  if (linkedAccounts.length === 0) {
    return (
      <motion.div 
        variants={itemVariants} initial="initial" animate="animate"
        className="mt-6 text-center py-10 bg-slate-800/60 rounded-lg border border-slate-700/60 shadow-inner"
      >
        <Briefcase size={48} className="mx-auto text-slate-500 mb-4" />
        <h3 className="text-xl font-semibold text-slate-300">No KDP Accounts Linked Yet</h3>
        <p className="text-slate-400 mt-1">Connect your first Amazon Advertising profile to get started.</p>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="mt-8 space-y-6"
      variants={{ container: { transition: { staggerChildren: 0.1 }}}}
      initial="container"
      animate="container"
    >
      <h2 className="text-2xl font-semibold text-slate-100 mb-2">Your Linked KDP Accounts</h2>
      {linkedAccounts.map((account) => {
        const badge = getStatusBadge(account.status);
        const canViewData = account.status === 'active';
        const needsRelink = account.status === 'reauth_required' || account.status === 'error_no_profile' || account.status === 'error_profile_fetch' || account.status === 'error_config';
        const canSync = account.status === 'active' || account.status === 'error_sync' || account.status === 'error_rate_limit';

        return (
          <motion.div key={account.id} variants={itemVariants}>
            <Card className="bg-slate-800/80 border border-slate-700/70 hover:border-purple-500/50 transition-all duration-300 shadow-lg overflow-hidden">
              <CardHeader className="pb-3 pt-4 px-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <CardTitle className="text-lg font-semibold text-purple-300 truncate" title={account.name || `Account ID: ${account.id}`}>
                    {account.name || `Account ${account.id.slice(-6)}`}
                  </CardTitle>
                  <div className={`flex items-center text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${badge.className}`}>
                    {badge.icon}
                    {badge.text}
                  </div>
                </div>
                <div className="text-xs text-slate-400 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 pt-1.5">
                  <span>Client ID: <span className="font-mono text-slate-500">{account.client_id?.substring(0,15) || 'N/A'}...</span></span>
                  <span>Profile ID: <span className="font-mono text-slate-500">{account.amazon_profile_id || 'Not Set'}</span></span>
                  <span className="flex items-center"><MapPin size={11} className="mr-1 text-slate-500"/>Region: <span className="font-mono text-slate-500 ml-1">{account.amazon_region || 'N/A'}</span></span>
                </div>
              </CardHeader>
              <CardContent className="pt-1 pb-3 px-5">
                <p className="text-xs text-slate-500">
                  Last Sync: {account.last_sync ? new Date(account.last_sync).toLocaleString() : 'Never'}
                </p>
              </CardContent>
              <CardFooter className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-700/50 p-4 bg-slate-800/50">
                <Button 
                  variant="outline" 
                  className="border-slate-600 text-slate-300 hover:bg-slate-700/70 hover:text-slate-100 w-full disabled:opacity-50"
                  onClick={() => navigate('/campaigns', { state: { defaultAccountId: account.id }})}
                  disabled={!canViewData || syncingAccountId === account.id || unlinkingAccountId === account.id}
                >
                  <Eye size={16} className="mr-2"/> View Data
                </Button>
                 {needsRelink ? (
                   <Button 
                      variant="destructive" 
                      className="w-full bg-yellow-500 hover:bg-yellow-600 text-yellow-900 border-yellow-600 hover:border-yellow-700 disabled:opacity-50"
                      onClick={() => navigate('/link-amazon', { state: { accountIdToRelink: account.id, client_id: account.client_id }})}
                      disabled={syncingAccountId === account.id || unlinkingAccountId === account.id}
                    >
                      <RefreshCcw size={16} className="mr-2"/> Re-link Required
                    </Button>
                 ) : (
                  <Button 
                      onClick={() => handleSyncData(account.id)} 
                      disabled={syncingAccountId === account.id || !canSync || unlinkingAccountId === account.id}
                      className="bg-blue-600 hover:bg-blue-700 text-white w-full disabled:opacity-50"
                  >
                      {syncingAccountId === account.id ? (
                          <Loader2 size={16} className="mr-2 animate-spin"/>
                      ) : (
                          <DownloadCloud size={16} className="mr-2"/>
                      )}
                      Sync Data
                  </Button>
                 )}
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                          variant="destructive" 
                          className="bg-red-700/80 hover:bg-red-600 text-red-100 border-red-600/50 hover:border-red-500 w-full disabled:opacity-50"
                          disabled={unlinkingAccountId === account.id || syncingAccountId === account.id}
                        >
                          {unlinkingAccountId === account.id ? (
                            <Loader2 size={16} className="mr-2 animate-spin"/>
                          ) : (
                            <Trash2 size={16} className="mr-2"/>
                          )}
                          Unlink
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-slate-800 border-slate-700 text-slate-100">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center text-red-400">
                          <ShieldAlert size={24} className="mr-2" />
                          Unlink Account: {account.name || account.id.slice(-6)}?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-400">
                          This action is permanent. All associated Robotads data (campaigns, rules, logs) for this account will be deleted.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="border-slate-600 hover:bg-slate-700 text-slate-300">Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleUnlinkAccount(account.id)}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          Yes, Unlink Account
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
              </CardFooter>
            </Card>
          </motion.div>
        )
      })}
    </motion.div>
  );
};

export default LinkedAccountsList;
