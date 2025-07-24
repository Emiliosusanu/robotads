import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { supabase } from '../../lib/supabaseClient';
import { useToast } from '../ui/use-toast';
import { Edit, Trash2, Play, Pause, Settings } from 'lucide-react';

const RulesList = ({ onEditRule, onAddRule }) => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('optimization_rules')
        .select('*')
        .eq('user_id', user.id)
        .order('priority', { ascending: true });

      if (error) throw error;
      setRules(data || []);
    } catch (error) {
      console.error('Error loading rules:', error);
      toast({
        title: "Error",
        description: "An error occurred while loading rules.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleRuleStatus = async (ruleId, enabled) => {
    try {
      const { error } = await supabase
        .from('optimization_rules')
        .update({ enabled: !enabled })
        .eq('id', ruleId);

      if (error) throw error;

      setRules(prev => prev.map(rule => 
        rule.id === ruleId ? { ...rule, enabled: !enabled } : rule
      ));

      toast({
        title: enabled ? "Rule paused" : "Rule enabled",
        description: `Rule successfully ${enabled ? 'paused' : 'enabled'}.`,
      });
    } catch (error) {
      console.error('Error toggling rule status:', error);
      toast({
        title: "Error",
        description: "An error occurred while updating rule status.",
        variant: "destructive",
      });
    }
  };

  const deleteRule = async (ruleId) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;

    try {
      const { error } = await supabase
        .from('optimization_rules')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;

      setRules(prev => prev.filter(rule => rule.id !== ruleId));

      toast({
        title: "Rule deleted",
        description: "Optimization rule deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting rule:', error);
      toast({
        title: "Error",
        description: "An error occurred while deleting the rule.",
        variant: "destructive",
      });
    }
  };

  const getMetricDisplayName = (metric) => {
    const metricNames = {
      'acos': 'ACOS',
      'ctr': 'CTR',
      'cpc': 'CPC',
      'spend': 'Spend',
      'orders': 'Orders'
    };
    return metricNames[metric] || metric;
  };

  const getConditionDisplayName = (condition) => {
    const conditionNames = {
      'greater_than': 'Greater Than',
      'less_than': 'Less Than',
      'equals': 'Equals'
    };
    return conditionNames[condition] || condition;
  };

  const getActionDisplayName = (action) => {
    const actionNames = {
      'decrease_bid': 'Decrease Bid',
      'increase_bid': 'Increase Bid',
      'pause_keyword': 'Pause Keyword',
      'pause_campaign': 'Pause Campaign',
      'adjust_budget': 'Adjust Budget'
    };
    return actionNames[action] || action;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      1: 'bg-red-100 text-red-800',
      2: 'bg-orange-100 text-orange-800',
      3: 'bg-yellow-100 text-yellow-800',
      4: 'bg-blue-100 text-blue-800',
      5: 'bg-gray-100 text-gray-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
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
        <h2 className="text-2xl font-bold">Optimization Rules</h2>
        <Button onClick={onAddRule} className="flex items-center space-x-2">
          <Settings className="h-4 w-4" />
          <span>New Rule</span>
        </Button>
      </div>

      {rules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Settings className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              You haven't created any rules yet
            </h3>
            <p className="text-gray-500 text-center mb-4">
              Create rules to automatically optimize your campaigns.
            </p>
            <Button onClick={onAddRule}>
              Create Your First Rule
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {rules.map((rule) => (
            <Card key={rule.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={() => toggleRuleStatus(rule.id, rule.enabled)}
                      />
                      <Badge className={getPriorityColor(rule.priority)}>
                        Priority {rule.priority}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{rule.name}</CardTitle>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEditRule(rule)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteRule(rule.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-600">Condition:</span>
                    <p className="mt-1">
                      {getMetricDisplayName(rule.settings.metric)} {getConditionDisplayName(rule.settings.condition)} {rule.settings.threshold}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Action:</span>
                    <p className="mt-1">
                      {getActionDisplayName(rule.settings.action)} (%{rule.settings.action_value})
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Scope:</span>
                    <p className="mt-1">
                      {rule.match_type === 'ALL' ? 'All Campaigns' : `${rule.settings.campaign_ids?.length || 0} Campaigns`}
                    </p>
                  </div>
                </div>
                
                {rule.last_run && (
                  <div className="mt-4 pt-4 border-t">
                    <span className="text-xs text-gray-500">
                      Last run: {new Date(rule.last_run).toLocaleString('en-US')}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default RulesList; 