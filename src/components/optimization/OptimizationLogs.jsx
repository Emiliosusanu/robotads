import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { supabase } from '../../lib/supabaseClient';
import { useToast } from '../ui/use-toast';
import { Clock, TrendingUp, TrendingDown, Pause, DollarSign } from 'lucide-react';

const OptimizationLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, today, week, month
  const { toast } = useToast();

  useEffect(() => {
    loadLogs();
  }, [filter]);

  const loadLogs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('optimization_logs')
        .select(`
          *,
          optimization_rules(name),
          amazon_campaigns(name)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Apply filter
      if (filter !== 'all') {
        const now = new Date();
        let startDate;

        switch (filter) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          default:
            startDate = null;
        }

        if (startDate) {
          query = query.gte('created_at', startDate.toISOString());
        }
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error loading optimization logs:', error);
      toast({
        title: "Error",
        description: "An error occurred while loading optimization logs.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'decrease_bid':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'increase_bid':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'pause_campaign':
      case 'pause_keyword':
        return <Pause className="h-4 w-4 text-orange-500" />;
      case 'adjust_budget':
        return <DollarSign className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActionDisplayName = (action) => {
    const actionNames = {
      'decrease_bid': 'Bid Decreased',
      'increase_bid': 'Bid Increased',
      'pause_keyword': 'Keyword Paused',
      'pause_campaign': 'Campaign Paused',
      'adjust_budget': 'Budget Adjusted'
    };
    return actionNames[action] || action;
  };

  const getActionColor = (action) => {
    const colors = {
      'decrease_bid': 'bg-red-100 text-red-800',
      'increase_bid': 'bg-green-100 text-green-800',
      'pause_keyword': 'bg-orange-100 text-orange-800',
      'pause_campaign': 'bg-orange-100 text-orange-800',
      'adjust_budget': 'bg-blue-100 text-blue-800'
    };
    return colors[action] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Optimization History</h2>
        <div className="flex space-x-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">This Month</option>
          </select>
        </div>
      </div>

      {logs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Clock className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              No optimization logs yet
            </h3>
            <p className="text-gray-500 text-center">
              You will see logs here when your optimization rules run.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {logs.map((log) => (
            <Card key={log.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      {getActionIcon(log.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge className={getActionColor(log.action)}>
                          {getActionDisplayName(log.action)}
                        </Badge>
                        {log.optimization_rules && (
                          <span className="text-sm text-gray-600">
                            Rule: {log.optimization_rules.name}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-700 mb-2">
                        {log.reason}
                      </p>
                      
                      <div className="text-xs text-gray-500 space-y-1">
                        {log.amazon_campaigns && (
                          <p>Campaign: {log.amazon_campaigns.name}</p>
                        )}
                        {log.entity_type && log.entity_id && (
                          <p>Entity: {log.entity_type} - {log.entity_id}</p>
                        )}
                        <p>Time: {formatDate(log.created_at)}</p>
                      </div>

                      {log.details && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-md">
                          <details className="text-xs">
                            <summary className="cursor-pointer font-medium text-gray-700 mb-2">
                              Show Details
                            </summary>
                            <pre className="whitespace-pre-wrap text-gray-600">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </details>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {logs.length > 0 && (
        <div className="text-center text-sm text-gray-500">
          Total {logs.length} optimization operations
        </div>
      )}
    </div>
  );
};

export default OptimizationLogs; 