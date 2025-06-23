import React from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ListFilter, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const ProfileSelectorView = ({ 
  availableProfiles, 
  selectedProfiles, 
  onProfileSelection, 
  onFinalizeLink,
  isFinalizing 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      <Card className="border-none shadow-none">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center text-purple-700 flex items-center justify-center">
            <ListFilter size={28} className="mr-2"/> Select Amazon Profiles to Link
          </CardTitle>
          <CardDescription className="text-center text-slate-600">
            Choose the advertising profiles you want to manage with Robotads.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
          {availableProfiles.map(profile => (
            <motion.div
              key={profile.profileId}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: (availableProfiles.indexOf(profile) * 0.05) }}
              className="flex items-center space-x-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
              onClick={() => onProfileSelection(profile.profileId.toString())}
            >
              <Checkbox
                id={`profile-${profile.profileId}`}
                checked={selectedProfiles.has(profile.profileId.toString())}
                onCheckedChange={() => onProfileSelection(profile.profileId.toString())}
                className="form-checkbox h-5 w-5 text-purple-600 border-slate-400 focus:ring-purple-500"
              />
              <Label htmlFor={`profile-${profile.profileId}`} className="flex-grow text-sm font-medium text-slate-700 cursor-pointer w-full">
                <div className="flex justify-between items-center">
                  <span>{profile.accountInfo?.name || `Profile ID: ${profile.profileId}`} ({profile.countryCode})</span>
                  <span className="text-xs text-slate-500">{profile.timezone}</span>
                </div>
                <div className="text-xs text-slate-500">Marketplace: {profile.accountInfo?.marketplaceStringId || 'N/A'}</div>
              </Label>
            </motion.div>
          ))}
        </CardContent>
        <CardFooter className="mt-6">
          <Button 
            onClick={onFinalizeLink} 
            disabled={selectedProfiles.size === 0 || isFinalizing}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-lg py-3"
          >
            {isFinalizing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Linking...
              </>
            ) : (
              `Link ${selectedProfiles.size > 0 ? `${selectedProfiles.size} Selected Profile(s)` : 'Selected Profile(s)'}`
            )}
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default ProfileSelectorView;