import React from 'react';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const InitialProcessingView = ({ title, description }) => {
  return (
    <motion.div 
      className="text-center"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <Loader2 className="h-16 w-16 text-blue-600 animate-spin mx-auto mb-6" />
      <h1 className="text-3xl font-bold mb-3 text-slate-800">{title}</h1>
      <p className="text-slate-600 text-lg">{description}</p>
    </motion.div>
  );
};

export default InitialProcessingView;