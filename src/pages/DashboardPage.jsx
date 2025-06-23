import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { DollarSign, ShoppingCart, BarChart2, Activity, AlertTriangle, DownloadCloud, Edit3, Eye, Lightbulb, Loader2, Info, RefreshCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import KpiCard from '@/components/dashboard/KpiCard';
import PerformanceChart from '@/components/dashboard/PerformanceChart';
import RecentEditsFeed from '@/components/dashboard/RecentEditsFeed';

const DashboardPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  
  const [summaryStats, setSummaryStats] = useState({
    currentSpend: 0, currentOrders: 0, currentAcos: 0, currentImpressions: 0,
    previousSpend: 0, previousOrders: 0, previousAcos: 0, previousImpressions: 0,
  });
  const [chartData, setChartData] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  
  const [linkedAccounts, setLinkedAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('all'); 
  const [timeRange, setTimeRange] = useState('7d'); 

  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false); 

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.1 } }
  };

  const fetchDashboardData = useCallback(async () => {
    if (!user) return;
    setLoadingDashboard(true);
    try {
      const { data: summaryDataRpc, error: summaryError } = await supabase.rpc('get_dashboard_summary', { 
        user_id_param: user.id, 
        account_id_param: selectedAccountId === 'all' ? null : selectedAccountId,
        time_range_param: timeRange
      });

      if (summaryError) {
        console.error("Summary RPC error:", summaryError);
        throw new Error(`Summary RPC error: ${summaryError.message}`);
      }
      
      if (summaryDataRpc && summaryDataRpc.length > 0) {
         setSummaryStats({
            currentSpend: summaryDataRpc[0].current_spend || 0,
            currentOrders: summaryDataRpc[0].current_orders || 0,
            currentAcos: summaryDataRpc[0].current_acos || 0,
            currentImpressions: summaryDataRpc[0].current_impressions || 0,
            previousSpend: summaryDataRpc[0].previous_spend || 0,
            previousOrders: summaryDataRpc[0].previous_orders || 0,
            previousAcos: summaryDataRpc[0].previous_acos || 0,
            previousImpressions: summaryDataRpc[0].previous_impressions || 0,
        });
      } else {
        setSummaryStats({ currentSpend: 0, currentOrders: 0, currentAcos: 0, currentImpressions: 0, previousSpend: 0, previousOrders: 0, previousAcos: 0, previousImpressions: 0 });
      }


      const { data: performanceDataRpc, error: chartError } = await supabase.rpc('get_performance_chart_data', {
        user_id_param: user.id,
        account_id_param: selectedAccountId === 'all' ? null : selectedAccountId,
        time_range_param: timeRange
      });
      if (chartError) {
        console.error("Chart RPC error:", chartError);
        throw new Error(`Chart RPC error: ${chartError.message}`);
      }
      setChartData(performanceDataRpc || []);

      const { data: logsData, error: logsError } = await supabase
        .from('optimization_logs')
        .select('*, optimization_rules (name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      if (logsError) {
        console.error("Logs fetch error:", logsError);
        throw new Error(`Logs fetch error: ${logsError.message}`);
      }
      setRecentLogs(logsData || []);

    } catch (e) {
      console.error("Error fetching dashboard data:", e);
      toast({ title: "Error Loading Dashboard", description: e.message, variant: "destructive" });
    } finally {
      setLoadingDashboard(false);
    }
  }, [user, selectedAccountId, timeRange, toast]);

  const fetchUserAndAccounts = useCallback(async () => {
    setLoadingDashboard(true); 
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    setUser(currentUser);
    if (currentUser) {
      try {
        const { data: accountsData, error: accountsError } = await supabase
          .from('amazon_accounts')
          .select('id, name, status, client_id')
          .eq('user_id', currentUser.id);
        if (accountsError) throw accountsError;
        setLinkedAccounts(accountsData || []);
      } catch(e) {
          toast({ title: "Error fetching accounts list", description: e.message, variant: "destructive"});
      }
    }
  }, [toast]);


  useEffect(() => {
    fetchUserAndAccounts();
  }, [fetchUserAndAccounts]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    } else {
      setLoadingDashboard(false); 
    }
  }, [user, selectedAccountId, timeRange, fetchDashboardData]);


  const handleSyncData = async (accountIdToSync) => {
    if (!user || isSyncing) {
        if(!user) toast({ title: "Not authenticated", description: "Please login to sync data.", variant: "destructive" });
        return;
    }
    
    const isSyncAll = accountIdToSync === 'all_accounts_sync';
    const accountsToProcess = isSyncAll 
      ? linkedAccounts.filter(acc => acc.status !== 'reauth_required' && acc.status !== 'error_no_profile' && acc.status !== 'error_no_region') 
      : [linkedAccounts.find(acc => acc.id === accountIdToSync)].filter(Boolean);

    if (accountsToProcess.length === 0) {
        toast({ title: "No Account to Sync", description: "No eligible linked accounts found to sync.", variant: "destructive"});
        return;
    }

    setIsSyncing(true);
    toast({ title: "Sync Initiated", description: `Syncing data for ${isSyncAll ? 'all eligible accounts' : `account ${accountsToProcess[0].name || accountsToProcess[0].id.slice(-5)}`}. This may take a few minutes.` });
    
    let overallSuccess = true;
    let finalMessage = "";

    for (const account of accountsToProcess) {
        console.log("Frontend: Calling fetch-amazon-data with user_id:", user.id, "and account_id:", account.id);
        try {
          const { data: funcData, error: funcError } = await supabase.functions.invoke('fetch-amazon-data', {
            body: { user_id: user.id, account_id: account.id, action: 'sync_all_data' },
          });

          console.log(`Frontend: fetch-amazon-data response for account ${account.id}:`, funcData);
          if(funcError) console.error(`Frontend: fetch-amazon-data error for account ${account.id}:`, funcError);

          let newStatus = account.status;
          if (funcError) {
            throw new Error(funcError.message || `Edge function call failed for account ${account.name}.`);
          }
          
          if (funcData && funcData.success === false) {
             finalMessage += `Account ${account.name}: ${funcData.error || "An issue occurred."}\n`;
             overallSuccess = false;
             if (funcData.needsReauth) newStatus = 'reauth_required';
             else if (funcData.error?.includes("Amazon Profile ID is missing")) newStatus = 'error_no_profile';
             else if (funcData.error?.includes("Amazon Region is missing")) newStatus = 'error_no_region';
             else if (funcData.error?.includes("Rate limit hit")) newStatus = 'error_rate_limit';
             else newStatus = 'error_sync';
          } else if (funcData && funcData.success === true) {
            finalMessage += `Account ${account.name}: ${funcData?.message || "Sync successful."}\n`;
            newStatus = 'active';
          } else {
            throw new Error(`Unexpected response from sync function for account ${account.name}.`);
          }
          
          setLinkedAccounts(prev => prev.map(acc => acc.id === account.id ? {...acc, status: newStatus, last_sync: newStatus === 'active' ? new Date().toISOString() : acc.last_sync } : acc));

        } catch (error) {
          console.error(`Frontend: Error in handleSyncData catch block for account ${account.name}:`, error);
          overallSuccess = false;
          let errorMessage = error.message || `Failed to sync data for account ${account.name}.`;
          finalMessage += `Account ${account.name}: ${errorMessage}\n`;
          
          let newStatusOnError = 'error_sync';
          if (errorMessage.toLowerCase().includes("re-authentication") || errorMessage.toLowerCase().includes("reauth_required")) newStatusOnError = 'reauth_required';
          else if (errorMessage.toLowerCase().includes("profile id is missing")) newStatusOnError = 'error_no_profile';
          else if (errorMessage.toLowerCase().includes("region is missing")) newStatusOnError = 'error_no_region';
          else if (errorMessage.toLowerCase().includes("rate limit hit")) newStatusOnError = 'error_rate_limit';
          
          setLinkedAccounts(prev => prev.map(acc => acc.id === account.id ? {...acc, status: newStatusOnError} : acc));
        }
    }
    
    toast({ 
        title: overallSuccess ? "Sync Completed" : "Sync Partially Failed", 
        description: finalMessage || "Sync process finished.", 
        variant: overallSuccess ? "default" : "destructive",
        className: overallSuccess ? "bg-green-600 text-white" : ""
    });

    fetchDashboardData(); 
    setIsSyncing(false);
  };
  
  const formatCurrency = (value) => `€${Number(value || 0).toFixed(2)}`;
  const formatPercent = (value) => `${Number(value*100 || 0).toFixed(1)}%`;
  const formatInteger = (value) => Number(value || 0).toLocaleString();

  const dummyWarnings = useMemo(() => {
    let warnings = [];
    if (linkedAccounts.some(acc => acc.status === 'reauth_required')) {
        warnings.push({id: 1, type: 'error', message: 'One or more Amazon accounts require re-authentication.', actionText: 'Re-link Accounts', action: () => navigate('/link-amazon')});
    }
    if (linkedAccounts.some(acc => acc.status === 'error_no_profile')) {
        warnings.push({id: 2, type: 'error', message: 'Profile ID missing for an account. Please re-link.', actionText: 'Re-link Account', action: () => navigate('/link-amazon', { state: { accountIdToRelink: linkedAccounts.find(a => a.status === 'error_no_profile')?.id, client_id: linkedAccounts.find(a => a.status === 'error_no_profile')?.client_id }})});
    }
    if (linkedAccounts.some(acc => acc.status === 'error_no_region')) {
        warnings.push({id: 3, type: 'error', message: 'Region missing for an account. Please re-link or contact support.', actionText: 'Re-link Account', action: () => navigate('/link-amazon', { state: { accountIdToRelink: linkedAccounts.find(a => a.status === 'error_no_region')?.id, client_id: linkedAccounts.find(a => a.status === 'error_no_region')?.client_id }})});
    }
    if (linkedAccounts.some(acc => acc.status === 'error_rate_limit')) {
        warnings.push({id: 4, type: 'warning', message: 'Rate limit hit for an account. Please wait before syncing again.', actionText: null, action: null});
    }
    const otherErrorAccounts = linkedAccounts.filter(acc => acc.status && acc.status.startsWith('error_') && !['error_no_profile', 'error_no_region', 'error_rate_limit'].includes(acc.status));
    otherErrorAccounts.forEach((acc, index) => {
        warnings.push({id: 5 + index, type: 'error', message: `Account ${acc.name || acc.id.slice(-5)} has a sync error (${acc.status}). Try re-linking or syncing again.`, actionText: 'Re-link Account', action: () => navigate('/link-amazon', { state: { accountIdToRelink: acc.id, client_id: acc.client_id }})});
    });
    return warnings;
  }, [linkedAccounts, navigate]);


  if (loadingDashboard && !user) { 
    return (
         <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
            <Loader2 size={48} className="text-primary animate-spin" />
         </div>
     )
  }

  const selectedAccountDetails = linkedAccounts.find(acc => acc.id === selectedAccountId);
  const showRelinkButtonForSelected = selectedAccountDetails && (selectedAccountDetails.status === 'reauth_required' || selectedAccountDetails.status === 'error_no_profile' || selectedAccountDetails.status === 'error_no_region');


  return (
    <motion.div 
      className="space-y-8"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-100">Performance Dashboard</h1>
          <p className="text-slate-400 mt-1">Overview of your Amazon PPC efforts.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Select value={selectedAccountId} onValueChange={setSelectedAccountId} disabled={loadingDashboard || isSyncing}>
            <SelectTrigger className="w-full sm:w-[180px] bg-slate-700 border-slate-600 text-slate-100">
              <SelectValue placeholder="Select Account" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 text-slate-100 border-slate-700">
              <SelectItem value="all">All Accounts</SelectItem>
              {linkedAccounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name || `...${acc.id.slice(-6)}`} ({acc.status || 'N/A'})</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={timeRange} onValueChange={setTimeRange} disabled={loadingDashboard || isSyncing}>
            <SelectTrigger className="w-full sm:w-[150px] bg-slate-700 border-slate-600 text-slate-100">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 text-slate-100 border-slate-700">
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
          {showRelinkButtonForSelected ? (
             <Button 
                onClick={() => navigate('/link-amazon', { state: { accountIdToRelink: selectedAccountDetails.id, client_id: selectedAccountDetails.client_id } })} 
                variant="destructive"
                className="w-full sm:w-auto"
            >
                <RefreshCcw size={18} className="mr-2"/> Re-link Selected Account
            </Button>
          ) : (
            <Button 
              onClick={() => handleSyncData(selectedAccountId === 'all' ? 'all_accounts_sync' : selectedAccountId)} 
              disabled={isSyncing || loadingDashboard || linkedAccounts.length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-md w-full sm:w-auto"
            >
              {isSyncing ? <Loader2 size={18} className="mr-2 animate-spin"/> : <DownloadCloud size={18} className="mr-2"/>}
              Sync Data
            </Button>
          )}
        </div>
      </div>

      {loadingDashboard && (!summaryStats.currentSpend && !summaryStats.currentOrders) && user ? (
         <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_,i) => <Card key={i} className="h-32 bg-slate-800/50 border-slate-700/30 animate-pulse"><CardHeader><CardTitle className="h-4 w-1/2 bg-slate-700 rounded"></CardTitle></CardHeader><CardContent><div className="h-8 w-3/4 bg-slate-600 rounded"></div></CardContent></Card>)}
         </div>
      ) : (
        <motion.div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4" variants={containerVariants}>
          <KpiCard title="ACOS" value={summaryStats.currentAcos} previousValue={summaryStats.previousAcos} icon={<BarChart2/>} unit="%" trendDirection="down" description="Average Cost of Sales"/>
          <KpiCard title="Spend" value={summaryStats.currentSpend} previousValue={summaryStats.previousSpend} icon={<DollarSign/>} unit="€" trendDirection="down" description="Total Ad Spend"/>
          <KpiCard title="Orders" value={summaryStats.currentOrders} previousValue={summaryStats.previousOrders} icon={<ShoppingCart/>} trendDirection="up" description="Total Orders from Ads"/>
          <KpiCard title="Impressions" value={summaryStats.currentImpressions} previousValue={summaryStats.previousImpressions} icon={<Eye/>} trendDirection="up" description="Total Ad Impressions"/>
        </motion.div>
      )}

      <motion.div variants={containerVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-slate-800/80 border-slate-700/60 shadow-lg">
          <CardHeader>
            <CardTitle className="text-slate-100">ACOS Trend</CardTitle>
            <CardDescription className="text-slate-400">ACOS current vs previous period.</CardDescription>
          </CardHeader>
          <CardContent>
            <PerformanceChart isLoading={loadingDashboard && chartData.length === 0 && user} data={chartData} dataKey="acos" dataKeyPrev="acos_prev" name="ACOS" strokeColor="#8884d8" prevStrokeColor="#82ca9d" formatTick={formatPercent} yAxisLabel="ACOS %"/>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/80 border-slate-700/60 shadow-lg">
          <CardHeader>
            <CardTitle className="text-slate-100">Orders Trend</CardTitle>
            <CardDescription className="text-slate-400">Orders current vs previous period.</CardDescription>
          </CardHeader>
          <CardContent>
             <PerformanceChart isLoading={loadingDashboard && chartData.length === 0 && user} data={chartData} dataKey="orders" dataKeyPrev="orders_prev" name="Orders" strokeColor="#82ca9d" prevStrokeColor="#ffc658" formatTick={formatInteger} yAxisLabel="Orders"/>
          </CardContent>
        </Card>
      </motion.div>
      <motion.div variants={containerVariants} className="grid grid-cols-1 lg:grid-cols-1 gap-6">
         <Card className="lg:col-span-1 bg-slate-800/80 border-slate-700/60 shadow-lg">
          <CardHeader>
            <CardTitle className="text-slate-100">Impressions Trend</CardTitle>
            <CardDescription className="text-slate-400">Impressions current vs previous period.</CardDescription>
          </CardHeader>
          <CardContent>
             <PerformanceChart isLoading={loadingDashboard && chartData.length === 0 && user} data={chartData} dataKey="impressions" dataKeyPrev="impressions_prev" name="Impressions" strokeColor="#ff7300" prevStrokeColor="#387908" formatTick={formatInteger} yAxisLabel="Impressions"/>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div className="grid grid-cols-1 lg:grid-cols-3 gap-6" variants={containerVariants}>
        <Card className="lg:col-span-2 bg-slate-800/80 border-slate-700/60 shadow-lg">
          <CardHeader>
            <CardTitle className="text-slate-100 flex items-center"><Activity size={20} className="mr-2 text-primary"/>Recent Optimization Edits</CardTitle>
            <CardDescription className="text-slate-400">Latest actions taken by your automation rules.</CardDescription>
          </CardHeader>
          <CardContent>
            <RecentEditsFeed isLoading={loadingDashboard && recentLogs.length === 0 && user} logs={recentLogs} />
          </CardContent>
        </Card>
        <div className="space-y-6">
            <Card className="bg-slate-800/80 border-slate-700/60 shadow-lg">
              <CardHeader>
                <CardTitle className="text-slate-100 flex items-center"><AlertTriangle size={20} className="mr-2 text-yellow-400"/>Warnings & Suggestions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {loadingDashboard && dummyWarnings.length === 0 && linkedAccounts.length > 0 ? ( 
                    <div className="flex items-center justify-center p-4"> <Loader2 className="h-5 w-5 animate-spin text-slate-400"/> </div>
                ) : dummyWarnings.length > 0 ? dummyWarnings.map(warn => (
                  <div key={warn.id} className={`p-2.5 rounded-md text-sm flex items-start gap-2 ${warn.type === 'error' ? 'bg-red-900/50 text-red-300 border-red-700/60' : 'bg-yellow-800/40 text-yellow-300 border-yellow-600/50'} border`}>
                    {warn.type === 'error' ? <AlertTriangle size={16} className="mt-0.5 shrink-0"/> : <Info size={16} className="mt-0.5 shrink-0"/> }
                    <span>{warn.message}
                    {warn.action && <Button variant="link" size="sm" className="p-0 h-auto ml-1 text-sky-400 hover:text-sky-300" onClick={warn.action}>{warn.actionText || 'Fix now'}</Button>}
                    </span>
                  </div>
                )) : <p className="text-slate-500 text-sm">No critical warnings. System nominal.</p>}
              </CardContent>
            </Card>
             <Card className="bg-slate-800/80 border-slate-700/60 shadow-lg">
              <CardHeader> 
                <CardTitle className="text-slate-100 flex items-center"><Lightbulb size={20} className="mr-2 text-teal-400"/>Smart Rule Suggestion</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-300">Campaign "<span className="font-semibold text-primary">Generic Auto Campaigns</span>" shows high ACOS (62%) with low Orders (3) over last 14 days.</p>
                <Button onClick={() => navigate('/settings', { state: { suggestedRule: { name: "Optimize Generic Auto ACOS", target_entity: "campaign_group", entity_id: "group_generic_auto", conditions: [{metric: 'acos', comparison: '>', value: 60, duration_days: 14}, {metric: 'orders', comparison: '<', value: 5, duration_days: 14}], action: {type: 'adjust_bid_percentage', value: -20}}}})} className="w-full bg-teal-600 hover:bg-teal-700">
                    <Edit3 size={16} className="mr-2"/> Create Rule from Suggestion
                </Button>
                <p className="text-xs text-slate-500">This is a simulated suggestion. Real AI-driven suggestions require backend processing.</p>
              </CardContent>
            </Card>
        </div>
      </motion.div>
      
    </motion.div>
  );
};

export default DashboardPage;