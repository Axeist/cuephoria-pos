import React, { useState } from 'react';
import { Search, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ExistingBookingsDialog } from './ExistingBookingsDialog';

export const ExistingBookingSearch = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showBookingsDialog, setShowBookingsDialog] = useState(false);

  const handleSearch = () => {
    if (phoneNumber.trim()) {
      setShowBookingsDialog(true);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <>
      <section className="relative py-12 bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="bg-black/40 backdrop-blur-sm border border-white/10">
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <div className="flex items-center justify-center mb-3">
                  <Calendar className="h-6 w-6 text-purple-400 mr-2" />
                  <h2 className="text-xl font-semibold text-white">
                    Check Your Existing Bookings
                  </h2>
                </div>
                <p className="text-gray-300 text-sm">
                  Enter your mobile number to view today's bookings
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <div className="flex-1">
                  <Input
                    type="tel"
                    placeholder="Enter mobile number"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:bg-white/20 focus:border-purple-400"
                    maxLength={10}
                  />
                </div>
                <Button
                  onClick={handleSearch}
                  disabled={!phoneNumber.trim()}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <ExistingBookingsDialog
        isOpen={showBookingsDialog}
        onClose={() => setShowBookingsDialog(false)}
        phoneNumber={phoneNumber}
      />
    </>
  );
};