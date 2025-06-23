import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertTriangle, Info, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const ResultView = ({ status, title, message, details, linkedProfilesData, onNavigate }) => {
  const navigate = useNavigate();
  let IconComponent;
  let titleColor;

  switch (status) {
    case 'success':
      IconComponent = CheckCircle;
      titleColor = 'text-green-600';
      break;
    case 'error':
      IconComponent = AlertTriangle;
      titleColor = 'text-red-600';
      break;
    case 'info':
      IconComponent = Info;
      titleColor = 'text-blue-600';
      break;
    default:
      IconComponent = Info;
      titleColor = 'text-slate-800';
  }
  
  const getNavigationPath = () => {
    if (status === 'error') return '/link-amazon';
    if (onNavigate) return onNavigate;
    return '/dashboard';
  };

  const getButtonText = () => {
    if (status === 'error') return 'Try Linking Again';
    if (status === 'info') return 'Manage Linked Accounts';
    return 'Go to Dashboard';
  };
  
  const getButtonClass = () => {
    if (status === 'error') return 'bg-blue-600 hover:bg-blue-700';
    if (status === 'info') return 'bg-blue-500 hover:bg-blue-600';
    return 'bg-green-500 hover:bg-green-600';
  }


  return (
    <motion.div 
      className="text-center"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <IconComponent className={`h-20 w-20 ${titleColor.replace('text-', 'text-')} mx-auto mb-6`} />
      <h1 className={`text-3xl font-bold ${titleColor} mb-3`}>{title}</h1>
      {message && <p className="text-slate-700 text-lg mb-6">{message}</p>}
      
      {details && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-left text-sm max-h-60 overflow-y-auto">
          <p className="font-semibold">Details:</p>
          <p>{details}</p>
        </div>
      )}

      {linkedProfilesData && linkedProfilesData.length > 0 && (
        <div className="text-slate-700 text-sm mb-6 text-left max-h-40 overflow-y-auto border p-2 rounded-md">
          <p className="font-semibold">Processed Profiles:</p>
          <ul className="list-disc list-inside mt-1">
            {linkedProfilesData.map(profile => (
              <li key={profile.profileId || profile.name}>
                {profile.name} 
                {profile.success ? 
                  (profile.alreadyLinked ? " (Already Active)" : " (Newly Linked/Updated)")
                  : ` (Failed: ${profile.error || 'Unknown reason'})`}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Button onClick={() => navigate(getNavigationPath(), { state: status === 'error' ? { error: 'linking_failed' } : {} })} className={`${getButtonClass()} text-white text-lg px-8 py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-300`}>
        {getButtonText()}
      </Button>

      {status === 'error' && (
         <Button variant="outline" onClick={() => window.open('https://www.amazon.com/ap/adam', '_blank')} className="w-full mt-3 text-blue-600 border-blue-600 hover:bg-blue-50 text-lg px-8 py-3 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-center">
            Check Amazon App Permissions <ExternalLink size={18} className="ml-2" />
        </Button>
      )}
    </motion.div>
  );
};

export default ResultView;