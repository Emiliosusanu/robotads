import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { supabase } from '../../lib/supabaseClient';
import { useToast } from '../ui/use-toast';

const RuleForm = ({ onRuleCreated, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [ruleData, setRuleData] = useState({
    name: '',
    enabled: true,
    priority: 1,
    match_type: 'ALL',
    bid_adjustment: 0.1,
    settings: {
      metric: 'acos',
      condition: 'greater_than',
      threshold: 40,
      action: 'decrease_bid',
      action_value: 10,
      campaign_ids: [],
      ad_group_ids: [],
      keyword_ids: []
    }
  });
  const { toast } = useToast();

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: account } = await supabase
        .from('amazon_accounts')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (account) {
        const { data: campaigns } = await supabase
          .from('amazon_campaigns')
          .select('id, name, campaign_id')
          .eq('account_id', account.id);

        setCampaigns(campaigns || []);
      }
    } catch (error) {
      console.error('Error loading campaigns:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const ruleToSave = {
        ...ruleData,
        user_id: user.id
      };

      const { data, error } = await supabase
        .from('optimization_rules')
        .insert(ruleToSave)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Rule created",
        description: "Optimization rule saved successfully.",
      });

      if (onRuleCreated) {
        onRuleCreated(data);
      }
    } catch (error) {
      console.error('Error creating rule:', error);
      toast({
        title: "Error",
        description: "An error occurred while creating the rule.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateRuleData = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setRuleData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setRuleData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>New Optimization Rule</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Rule Name</Label>
              <Input
                id="name"
                value={ruleData.name}
                onChange={(e) => updateRuleData('name', e.target.value)}
                placeholder="Ex: High ACOS Campaigns"
                required
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="enabled"
                checked={ruleData.enabled}
                onCheckedChange={(checked) => updateRuleData('enabled', checked)}
              />
              <Label htmlFor="enabled">Enable Rule</Label>
            </div>

            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={ruleData.priority.toString()}
                onValueChange={(value) => updateRuleData('priority', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - Highest</SelectItem>
                  <SelectItem value="2">2 - High</SelectItem>
                  <SelectItem value="3">3 - Medium</SelectItem>
                  <SelectItem value="4">4 - Low</SelectItem>
                  <SelectItem value="5">5 - Lowest</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Condition Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Condition Settings</h3>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="metric">Metric</Label>
                <Select
                  value={ruleData.settings.metric}
                  onValueChange={(value) => updateRuleData('settings.metric', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="acos">ACOS</SelectItem>
                    <SelectItem value="ctr">CTR</SelectItem>
                    <SelectItem value="cpc">CPC</SelectItem>
                    <SelectItem value="spend">Spend</SelectItem>
                    <SelectItem value="orders">Orders</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="condition">Condition</Label>
                <Select
                  value={ruleData.settings.condition}
                  onValueChange={(value) => updateRuleData('settings.condition', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="greater_than">Greater Than</SelectItem>
                    <SelectItem value="less_than">Less Than</SelectItem>
                    <SelectItem value="equals">Equals</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="threshold">Threshold Value</Label>
                <Input
                  id="threshold"
                  type="number"
                  step="0.01"
                  value={ruleData.settings.threshold}
                  onChange={(e) => updateRuleData('settings.threshold', parseFloat(e.target.value))}
                  placeholder="40"
                />
              </div>
            </div>
          </div>

          {/* Action Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Action Settings</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="action">Action</Label>
                <Select
                  value={ruleData.settings.action}
                  onValueChange={(value) => updateRuleData('settings.action', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="decrease_bid">Decrease Bid</SelectItem>
                    <SelectItem value="increase_bid">Increase Bid</SelectItem>
                    <SelectItem value="pause_keyword">Pause Keyword</SelectItem>
                    <SelectItem value="pause_campaign">Pause Campaign</SelectItem>
                    <SelectItem value="adjust_budget">Adjust Budget</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="action_value">Action Value (%)</Label>
                <Input
                  id="action_value"
                  type="number"
                  step="0.1"
                  value={ruleData.settings.action_value}
                  onChange={(e) => updateRuleData('settings.action_value', parseFloat(e.target.value))}
                  placeholder="10"
                />
              </div>
            </div>
          </div>

          {/* Campaign Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Campaign Selection</h3>
            
            <div>
              <Label htmlFor="match_type">Match Type</Label>
              <Select
                value={ruleData.match_type}
                onValueChange={(value) => updateRuleData('match_type', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Campaigns</SelectItem>
                  <SelectItem value="SELECTED">Selected Campaigns</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {ruleData.match_type === 'SELECTED' && (
              <div>
                <Label>Campaigns</Label>
                <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-2">
                  {campaigns.map((campaign) => (
                    <label key={campaign.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={ruleData.settings.campaign_ids.includes(campaign.id)}
                        onChange={(e) => {
                          const newIds = e.target.checked
                            ? [...ruleData.settings.campaign_ids, campaign.id]
                            : ruleData.settings.campaign_ids.filter(id => id !== campaign.id);
                          updateRuleData('settings.campaign_ids', newIds);
                        }}
                      />
                      <span className="text-sm">{campaign.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Rule'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default RuleForm; 