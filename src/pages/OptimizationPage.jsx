import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useToast } from '../components/ui/use-toast';
import RuleForm from '../components/optimization/RuleForm';
import RulesList from '../components/optimization/RulesList';
import OptimizationLogs from '../components/optimization/OptimizationLogs';
import { runManualOptimization } from '../lib/optimizationEngine';
import { supabase } from '../lib/supabaseClient';
import { Settings, Play, History, BarChart3, TrendingUp } from 'lucide-react';

const OptimizationPage = () => {
  const [activeTab, setActiveTab] = useState('rules');
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [optimizing, setOptimizing] = useState(false);
  const { toast } = useToast();

  const handleAddRule = () => {
    setEditingRule(null);
    setShowRuleForm(true);
  };

  const handleEditRule = (rule) => {
    setEditingRule(rule);
    setShowRuleForm(true);
  };

  const handleRuleCreated = (rule) => {
    setShowRuleForm(false);
    setEditingRule(null);
    toast({
      title: "Success",
      description: "Optimization rule created successfully.",
    });
  };

  const handleRuleCancel = () => {
    setShowRuleForm(false);
    setEditingRule(null);
  };

  const handleManualOptimization = async () => {
    setOptimizing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const result = await runManualOptimization(user.id);
      
      if (result.success) {
        toast({
          title: "Optimization Completed",
          description: "Your rules have been applied successfully.",
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Manual optimization error:', error);
      toast({
        title: "Error",
        description: "An error occurred during optimization: " + error.message,
        variant: "destructive",
      });
    } finally {
      setOptimizing(false);
    }
  };

  if (showRuleForm) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={handleRuleCancel}
            className="mb-4"
          >
            ← Go Back
          </Button>
          <h1 className="text-3xl font-bold">
            {editingRule ? 'Edit Rule' : 'New Optimization Rule'}
          </h1>
        </div>
        <RuleForm
          onRuleCreated={handleRuleCreated}
          onCancel={handleRuleCancel}
          editingRule={editingRule}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Optimization Center</h1>
            <p className="text-gray-600">
              Automatically optimize your Amazon campaigns
            </p>
          </div>
          <div className="flex space-x-3">
            <Button
              onClick={handleManualOptimization}
              disabled={optimizing}
              className="flex items-center space-x-2"
            >
              <Play className="h-4 w-4" />
              <span>{optimizing ? 'Optimizing...' : 'Optimize Now'}</span>
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Settings className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Rules</p>
                  <p className="text-2xl font-bold">3</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Optimized This Month</p>
                  <p className="text-2xl font-bold">12</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Average ACOS</p>
                  <p className="text-2xl font-bold">24.5%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <History className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Last Optimization</p>
                  <p className="text-sm font-bold">2 hours ago</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="rules" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Rules</span>
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center space-x-2">
            <History className="h-4 w-4" />
            <span>History</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Analytics</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-6">
          <RulesList
            onEditRule={handleEditRule}
            onAddRule={handleAddRule}
          />
        </TabsContent>

        <TabsContent value="logs" className="space-y-6">
          <OptimizationLogs />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Optimization Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">
                  Analytics Feature Coming Soon
                </h3>
                <p className="text-gray-500">
                  Detailed optimization analytics and reports will be added soon.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OptimizationPage; 