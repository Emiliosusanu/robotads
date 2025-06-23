
import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, TrendingUp, TrendingDown } from 'lucide-react';

const KpiCard = ({ title, value, previousValue, icon, unit = '', trendDirection, description }) => {
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  };

  let percentageChange = 0;
  const numericValue = parseFloat(value);
  const numericPreviousValue = parseFloat(previousValue);

  if (!isNaN(numericPreviousValue) && numericPreviousValue !== 0) {
    percentageChange = ((numericValue - numericPreviousValue) / numericPreviousValue) * 100;
  } else if (!isNaN(numericPreviousValue) && numericPreviousValue === 0 && numericValue > 0) {
    percentageChange = 100; 
  } else if (isNaN(numericPreviousValue) && numericValue > 0) {
    percentageChange = 100;
  }
  
  const isPositiveChangeGood = trendDirection === 'up' ? true : (trendDirection === 'down' ? false : null);
  let changeColor = 'text-slate-400';
  let TrendIconComponent = Activity;

  if (!isNaN(percentageChange) && percentageChange !== 0) {
    if (percentageChange > 0) {
      changeColor = isPositiveChangeGood === true ? 'text-green-400' : (isPositiveChangeGood === false ? 'text-red-400' : 'text-yellow-400');
      TrendIconComponent = TrendingUp;
    } else { 
      changeColor = isPositiveChangeGood === true ? 'text-red-400' : (isPositiveChangeGood === false ? 'text-green-400' : 'text-yellow-400');
      TrendIconComponent = TrendingDown;
    }
  }

  const displayValue = unit === '%' ? `${(numericValue || 0).toFixed(2)}${unit}` : 
                       unit === '€' ? `${unit}${(numericValue || 0).toFixed(2)}` :
                       (numericValue || 0).toLocaleString();
  
  const displayPrevValue = unit === '%' ? `${(numericPreviousValue || 0).toFixed(2)}${unit}` :
                           unit === '€' ? `${unit}${(numericPreviousValue || 0).toFixed(2)}` :
                           isNaN(numericPreviousValue) ? 'N/A' : (numericPreviousValue || 0).toLocaleString();

  return (
    <motion.div variants={cardVariants}>
      <Card className="glassmorphism-card hover:border-primary/60 transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-300">{title}</CardTitle>
          {React.cloneElement(icon, { className: `h-5 w-5 text-primary` })}
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-slate-100">{displayValue}</div>
          <div className="text-xs text-slate-400 flex items-center pt-1">
            {previousValue !== null && previousValue !== undefined && !isNaN(numericPreviousValue) ? (
              <>
                <span className={changeColor}>
                  <TrendIconComponent size={14} className="mr-1 inline"/>
                  {isNaN(percentageChange) ? 'N/A' : `${percentageChange.toFixed(1)}%`}
                </span>
                <span className="ml-1">vs prev. ({displayPrevValue})</span>
              </>
            ) : (
              <span>{description || 'No previous data'}</span>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default KpiCard;
