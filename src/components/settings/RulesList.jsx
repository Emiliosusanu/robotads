import React from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2, Edit3, Clock, PlusCircle, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { actionTypeOptions } from './settingsConstants';

const RulesList = ({ rules, loading, showForm, onEdit, onDelete, onToggleEnabled, onOpenNewRuleForm }) => {
  
  const itemVariants = {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 }
  };

  return (
    <div className="mt-10">
      <h2 className="text-3xl font-semibold text-slate-100 mb-6">Your Optimization Rules</h2>
      {loading && rules.length === 0 && <p className="text-slate-400">Loading rules...</p>}
      {!loading && rules.length === 0 && !showForm && (
        <Card className="bg-slate-800/60 border-slate-700/50 shadow-lg text-center p-8">
          <Zap size={48} className="mx-auto text-purple-400 mb-4 opacity-70" />
          <CardTitle className="text-xl text-slate-200">No Optimization Rules Yet</CardTitle>
          <CardDescription className="text-slate-400 mt-2 mb-6">Click "Create New Rule" to get started with automating your PPC campaigns.</CardDescription>
          <Button onClick={onOpenNewRuleForm} className="bg-purple-600 hover:bg-purple-700 text-white">
            <PlusCircle size={20} className="mr-2" /> Create Your First Rule
          </Button>
        </Card>
      )}
      <AnimatePresence>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rules.map(rule => (
            <motion.div key={rule.id} variants={itemVariants} initial="initial" animate="animate" exit="exit">
              <Card className={`border-2 ${rule.enabled ? 'border-purple-500/70' : 'border-slate-700/50'} bg-slate-800/70 shadow-lg hover:shadow-purple-500/20 transition-all duration-300 flex flex-col h-full`}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                      <CardTitle className="text-xl text-purple-300 break-all">{rule.name}</CardTitle>
                      <Switch checked={rule.enabled} onCheckedChange={() => onToggleEnabled(rule)} 
                          className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-slate-600"
                      />
                  </div>
                  <CardDescription className="text-slate-400">Priority: {rule.priority} | Target: {rule.settings?.target_entity}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow space-y-3 text-sm">
                  <div className="text-slate-300">
                      <strong className="text-purple-400">Conditions:</strong> 
                      <ul className="list-disc list-inside pl-2 text-xs text-slate-400">
                      {rule.settings?.conditions?.slice(0,2).map((c, i) => <li key={i} className="truncate">{c.metric} {c.comparison} {c.value} for {c.duration_days} days</li>)}
                      {rule.settings?.conditions?.length > 2 && <li className="text-xs text-slate-500">...and {rule.settings.conditions.length - 2} more.</li>}
                      </ul>
                  </div>
                  <div className="text-slate-300">
                      <strong className="text-purple-400">Action:</strong> <span className="text-xs text-slate-400">{actionTypeOptions.find(a => a.value === rule.settings?.action?.type)?.label} ({rule.settings?.action?.value}{rule.settings?.action?.type?.includes('percentage') ? '%' : ''})</span>
                  </div>
                  <div className="text-slate-500 text-xs flex items-center">
                      <Clock size={14} className="mr-1.5"/> Check every {rule.settings?.frequency_hours} hours. Last run: {rule.last_run ? new Date(rule.last_run).toLocaleTimeString() : 'Never'}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2 pt-4 border-t border-slate-700/50 mt-auto">
                  <Button variant="outline" size="sm" onClick={() => onEdit(rule)} className="text-blue-400 border-blue-500 hover:bg-blue-500/10">
                    <Edit3 size={16} className="mr-1.5"/> Edit
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-red-400 border-red-500 hover:bg-red-500/10">
                          <Trash2 size={16} className="mr-1.5"/> Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-slate-800 border-slate-700 text-slate-100">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-400">
                          This action cannot be undone. This will permanently delete the rule "{rule.name}".
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="border-slate-600 hover:bg-slate-700">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDelete(rule.id)} className="bg-red-600 hover:bg-red-700 text-white">Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
      </AnimatePresence>
    </div>
  );
};

export default RulesList;