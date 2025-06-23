import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Trash2, PlusCircle, Loader2, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { metricOptions, comparisonOptions, actionTypeOptions, entityTypeOptions, matchTypeOptions as allMatchTypeOptions } from './settingsConstants';

const RuleForm = ({ currentRule, setCurrentRule, isEditing, loading, onSubmit, onCancel }) => {

  const formVariants = {
    hidden: { opacity: 0, height: 0, y: -20 },
    visible: { opacity: 1, height: 'auto', y: 0, transition: { duration: 0.4, ease: "easeInOut" } },
  };

  const itemVariants = {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
  };
  
  const handleBaseInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : (type === 'number' ? parseFloat(value) || '' : value);
    setCurrentRule(prev => ({ ...prev, [name]: val }));
  };

  const handleSettingsInputChange = (e, field) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : (type === 'number' ? parseFloat(value) || '' : value);
    setCurrentRule(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [field || name]: val,
      }
    }));
  };

  const handleSettingsSelectChange = (value, field) => {
    setCurrentRule(prev => {
      const newSettings = { ...prev.settings, [field]: value };
      if (field === 'target_entity') {
        if (value === 'asin_target') {
          newSettings.match_type = 'asin_targeting_manual'; 
        } else {
          newSettings.match_type = 'all'; 
        }
      }
      return { ...prev, settings: newSettings };
    });
  };

  const handleConditionChange = (index, field, value, type = 'text') => {
    const val = type === 'number' ? parseFloat(value) || '' : value;
    setCurrentRule(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        conditions: prev.settings.conditions.map((cond, i) => 
          i === index ? { ...cond, [field]: val } : cond
        ),
      }
    }));
  };
  
  const handleActionChange = (field, value, type = 'text') => {
    const val = type === 'number' ? parseFloat(value) || '' : value;
    setCurrentRule(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        action: {
          ...prev.settings.action,
          [field]: val,
        }
      }
    }));
  };

  const addCondition = () => {
    setCurrentRule(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        conditions: [
          ...prev.settings.conditions,
          { metric: 'acos', comparison: '>', value: 30, duration_days: 7 }
        ]
      }
    }));
  };

  const removeCondition = (index) => {
    if (currentRule.settings.conditions.length <= 1) {
        console.warn("At least one condition is required.");
        return;
    }
    setCurrentRule(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        conditions: prev.settings.conditions.filter((_, i) => i !== index),
      }
    }));
  };
  
  const handleEnabledChange = (checked) => {
    setCurrentRule(prev => ({ ...prev, enabled: checked }));
  };

  const internalSubmit = (e) => {
    e.preventDefault();
    onSubmit(currentRule);
  };

  const availableMatchTypeOptions = allMatchTypeOptions.filter(opt => 
    currentRule.settings.target_entity === 'keyword' ? opt.entity === 'keyword' : opt.entity === 'asin_target'
  );


  return (
    <motion.div variants={formVariants} initial="hidden" animate="visible" exit="hidden">
      <Card className="bg-slate-800/80 border-slate-700/60 shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl text-purple-300">{isEditing ? 'Edit Optimization Rule' : 'Create New Optimization Rule'}</CardTitle>
          <CardDescription className="text-slate-400">Define conditions and actions for automated PPC optimization.</CardDescription>
        </CardHeader>
        <form onSubmit={internalSubmit}>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="name" className="text-slate-300">Rule Name</Label>
                <Input id="name" name="name" value={currentRule.name} onChange={handleBaseInputChange} placeholder="e.g., High ACOS Keywords" required className="bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-500"/>
              </div>
              <div>
                <Label htmlFor="priority" className="text-slate-300">Priority (1 = highest)</Label>
                <Input id="priority" name="priority" type="number" min="1" value={currentRule.priority} onChange={handleBaseInputChange} required className="bg-slate-700 border-slate-600 text-slate-100"/>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div>
                  <Label htmlFor="target_entity" className="text-slate-300 block mb-1">Target Entity</Label>
                  <Select value={currentRule.settings.target_entity} onValueChange={(val) => handleSettingsSelectChange(val, 'target_entity')}>
                      <SelectTrigger className="w-full bg-slate-700 border-slate-600 text-slate-100">
                          <SelectValue placeholder="Select entity type" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 text-slate-100 border-slate-700">
                          {entityTypeOptions.map(opt => <SelectItem key={opt.value} value={opt.value} disabled={opt.disabled}>{opt.label}</SelectItem>)}
                      </SelectContent>
                  </Select>
              </div>
              <div>
                  <Label htmlFor="match_type" className="text-slate-300 block mb-1">
                    {currentRule.settings.target_entity === 'keyword' ? 'Keyword Match Type' : 'ASIN Target Type'}
                  </Label>
                  <Select value={currentRule.settings.match_type} onValueChange={(val) => handleSettingsSelectChange(val, 'match_type')}>
                      <SelectTrigger className="w-full bg-slate-700 border-slate-600 text-slate-100">
                          <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 text-slate-100 border-slate-700">
                          {availableMatchTypeOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                      </SelectContent>
                  </Select>
              </div>
            </div>

            <div className="space-y-4 p-4 border border-slate-700 rounded-lg bg-slate-800/50">
              <h3 className="text-lg font-semibold text-purple-400">Conditions (ALL must be met)</h3>
              {currentRule.settings.conditions.map((cond, index) => (
                <motion.div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end p-3 bg-slate-700/50 rounded-md" variants={itemVariants} initial="initial" animate="animate">
                  <div>
                    <Label className="text-xs text-slate-400">Metric</Label>
                    <Select value={cond.metric} onValueChange={(val) => handleConditionChange(index, 'metric', val)}>
                      <SelectTrigger className="bg-slate-600 border-slate-500 text-slate-100"><SelectValue/></SelectTrigger>
                      <SelectContent className="bg-slate-700 text-slate-100 border-slate-600">{metricOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-400">Comparison</Label>
                    <Select value={cond.comparison} onValueChange={(val) => handleConditionChange(index, 'comparison', val)}>
                      <SelectTrigger className="bg-slate-600 border-slate-500 text-slate-100"><SelectValue/></SelectTrigger>
                      <SelectContent className="bg-slate-700 text-slate-100 border-slate-600">{comparisonOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-400">Value</Label>
                    <Input type="number" step="any" value={cond.value} onChange={(e) => handleConditionChange(index, 'value', e.target.value, 'number')} className="bg-slate-600 border-slate-500 text-slate-100"/>
                  </div>
                  <div className="flex items-end gap-2">
                      <div>
                          <Label className="text-xs text-slate-400">For (Days)</Label>
                          <Input type="number" min="1" value={cond.duration_days} onChange={(e) => handleConditionChange(index, 'duration_days', e.target.value, 'number')} className="bg-slate-600 border-slate-500 text-slate-100"/>
                      </div>
                      <Button type="button" variant="destructive" size="icon" onClick={() => removeCondition(index)} className="h-10 w-10 bg-red-700 hover:bg-red-800" disabled={currentRule.settings.conditions.length <= 1}>
                          <Trash2 size={16}/>
                      </Button>
                  </div>
                </motion.div>
              ))}
              <Button type="button" variant="outline" onClick={addCondition} className="border-purple-500 text-purple-400 hover:bg-purple-500/10 hover:text-purple-300">
                <PlusCircle size={16} className="mr-2"/> Add Condition
              </Button>
            </div>

            <div className="space-y-3 p-4 border border-slate-700 rounded-lg bg-slate-800/50">
              <h3 className="text-lg font-semibold text-purple-400">Action</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                  <div>
                      <Label className="text-xs text-slate-400">Action Type</Label>
                      <Select value={currentRule.settings.action.type} onValueChange={(val) => handleActionChange('type', val)}>
                          <SelectTrigger className="bg-slate-700 border-slate-600 text-slate-100"><SelectValue/></SelectTrigger>
                          <SelectContent className="bg-slate-800 text-slate-100 border-slate-700">{actionTypeOptions.map(opt => <SelectItem key={opt.value} value={opt.value} disabled={opt.disabled}>{opt.label}</SelectItem>)}</SelectContent>
                      </Select>
                  </div>
                  { (currentRule.settings.action.type.includes('adjust') || currentRule.settings.action.type.includes('set_bid')) &&
                      <div>
                          <Label className="text-xs text-slate-400">Action Value</Label>
                          <Input type="number" step="any" value={currentRule.settings.action.value} onChange={(e) => handleActionChange('value', e.target.value, 'number')} className="bg-slate-700 border-slate-600 text-slate-100"/>
                          {currentRule.settings.action.type === 'adjust_bid_percentage' && <p className="text-xs text-slate-500 mt-1">Enter negative for decrease (e.g., -10 for 10% down).</p>}
                      </div>
                  }
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div>
                  <Label htmlFor="frequency_hours" className="text-slate-300">Check Frequency (Hours)</Label>
                  <Input id="frequency_hours" name="frequency_hours" type="number" min="1" value={currentRule.settings.frequency_hours} onChange={(e) => handleSettingsInputChange(e, 'frequency_hours')} className="bg-slate-700 border-slate-600 text-slate-100"/>
                  <p className="text-xs text-slate-500 mt-1">How often the backend should evaluate this rule.</p>
              </div>
                <div className="flex items-center space-x-2 pt-6">
                  <Switch id="enabled" name="enabled" checked={currentRule.enabled} onCheckedChange={handleEnabledChange} />
                  <Label htmlFor="enabled" className="text-slate-300">Rule Enabled</Label>
              </div>
            </div>

          </CardContent>
          <CardFooter className="flex justify-end gap-3 pt-6 border-t border-slate-700/50">
            <Button type="button" variant="outline" onClick={onCancel} className="text-slate-300 border-slate-600 hover:bg-slate-700">Cancel</Button>
            <Button type="submit" disabled={loading || !currentRule.name } className="bg-green-600 hover:bg-green-700 text-white shadow-md">
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : (isEditing ? 'Update Rule' : 'Create Rule')}
            </Button>
          </CardFooter>
        </form>
        {!currentRule.name && (
            <motion.div initial={{opacity: 0, y:10}} animate={{opacity:1, y:0}} className="p-4 mt-4 bg-yellow-900/30 border border-yellow-700 rounded-md text-yellow-300 text-sm flex items-center gap-2">
                <AlertTriangle size={18}/> Rule name is required to save.
            </motion.div>
        )}
      </Card>
    </motion.div>
  );
};

export default RuleForm;