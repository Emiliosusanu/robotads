import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from '@/components/ui/use-toast';
import { Settings as SettingsIcon, PlusCircle, Trash2, Edit3, Clock, Zap, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import RuleForm from '@/components/settings/RuleForm';
import RulesList from '@/components/settings/RulesList';
import GlobalAutomationSettings from '@/components/settings/GlobalAutomationSettings';
import { initialRuleState } from '@/components/settings/settingsConstants';


const SettingsPage = () => {
  const [rules, setRules] = useState([]);
  const [currentRule, setCurrentRule] = useState(JSON.parse(JSON.stringify(initialRuleState)));
  const [isEditing, setIsEditing] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [user, setUser] = useState(null);

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
    };
    fetchUser();
  }, []);

  const fetchRules = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('optimization_rules')
        .select('*')
        .eq('user_id', user.id)
        .order('priority', { ascending: true });
      if (error) throw error;
      setRules(data || []);
    } catch (error) {
      toast({ title: "Error fetching rules", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user) {
      fetchRules();
    }
  }, [user, fetchRules]);

  const handleSubmit = async (ruleDataToSave) => {
    if (!user) {
        toast({ title: "Not Authenticated", description: "Please login to save rules.", variant: "destructive" });
        return;
    }
    setLoading(true);
    try {
      let response;
      const finalRuleData = { ...ruleDataToSave, user_id: user.id };
      
      if (isEditing && editingRuleId) {
        response = await supabase.from('optimization_rules').update(finalRuleData).eq('id', editingRuleId).select();
      } else {
        response = await supabase.from('optimization_rules').insert(finalRuleData).select();
      }
      
      const { data, error } = response;

      if (error) throw error;
      
      toast({ title: `Rule ${isEditing ? 'Updated' : 'Created'}`, description: `Rule "${data[0].name}" saved successfully.`, variant: "default", className: "bg-green-600 text-white" });
      setShowForm(false);
      setIsEditing(false);
      setEditingRuleId(null);
      setCurrentRule(JSON.parse(JSON.stringify(initialRuleState)));
      fetchRules();
    } catch (error) {
      toast({ title: `Error saving rule`, description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (rule) => {
    setIsEditing(true);
    setEditingRuleId(rule.id);
    setCurrentRule(JSON.parse(JSON.stringify(rule))); // Deep copy
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (ruleId) => {
    setLoading(true);
    try {
      const { error } = await supabase.from('optimization_rules').delete().eq('id', ruleId);
      if (error) throw error;
      toast({ title: "Rule Deleted", description: "The rule has been successfully deleted.", variant: "default", className: "bg-red-600 text-white" });
      fetchRules();
      if (editingRuleId === ruleId) { // If deleting the rule currently in edit form
        setShowForm(false);
        setIsEditing(false);
        setEditingRuleId(null);
        setCurrentRule(JSON.parse(JSON.stringify(initialRuleState)));
      }
    } catch (error) {
      toast({ title: "Error deleting rule", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };
  
  const toggleRuleEnabled = async (rule) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('optimization_rules')
        .update({ enabled: !rule.enabled, updated_at: new Date().toISOString() })
        .eq('id', rule.id)
        .select();
      if (error) throw error;
      toast({ title: `Rule ${data[0].enabled ? 'Enabled' : 'Disabled'}`, variant: "default" });
      fetchRules();
    } catch (error) {
      toast({ title: "Error updating rule status", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const openNewRuleForm = () => {
    setIsEditing(false);
    setEditingRuleId(null);
    setCurrentRule(JSON.parse(JSON.stringify(initialRuleState)));
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setIsEditing(false);
    setEditingRuleId(null);
    setCurrentRule(JSON.parse(JSON.stringify(initialRuleState)));
  };

  return (
    <motion.div 
      className="space-y-8"
      initial="initial"
      animate="animate"
      variants={pageVariants}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SettingsIcon size={36} className="text-purple-400" />
          <h1 className="text-4xl font-bold tracking-tight text-slate-100">Optimization Settings</h1>
        </div>
        {!showForm && (
            <Button onClick={openNewRuleForm} className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg">
            <PlusCircle size={20} className="mr-2" /> Create New Rule
            </Button>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <RuleForm
            currentRule={currentRule}
            setCurrentRule={setCurrentRule}
            isEditing={isEditing}
            loading={loading}
            onSubmit={handleSubmit}
            onCancel={closeForm}
          />
        )}
      </AnimatePresence>

      <RulesList
        rules={rules}
        loading={loading}
        showForm={showForm}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggleEnabled={toggleRuleEnabled}
        onOpenNewRuleForm={openNewRuleForm}
      />
      
      <GlobalAutomationSettings />

    </motion.div>
  );
};

export default SettingsPage;