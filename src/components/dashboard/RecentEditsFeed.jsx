
import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

const RecentEditsFeed = ({ logs, isLoading }) => {
  if (isLoading) {
    return (
      <div className="h-40 flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={28}/>
      </div>
    );
  }
  if (!logs || logs.length === 0) {
    return <p className="text-slate-500 text-sm">No recent optimization edits found.</p>;
  }
  return (
    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
      {logs.map(log => (
        <motion.div 
          key={log.id} 
          className="p-3 bg-slate-700/40 rounded-lg border border-slate-600/50"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex justify-between items-start">
            <span className="text-xs text-primary font-semibold">{log.action} on {log.entity_type || 'N/A'}</span>
            <span className="text-xs text-slate-500">{new Date(log.created_at).toLocaleString()}</span>
          </div>
          <p className="text-sm text-slate-300 mt-1">{log.reason}</p>
          {log.details && <pre className="mt-1 text-xs text-slate-400 bg-slate-800 p-2 rounded overflow-x-auto">{JSON.stringify(log.details, null, 2)}</pre>}
          <p className="text-xs text-slate-500 mt-1">Rule: {log.optimization_rules?.name || 'N/A'}</p>
        </motion.div>
      ))}
    </div>
  );
};

export default RecentEditsFeed;
