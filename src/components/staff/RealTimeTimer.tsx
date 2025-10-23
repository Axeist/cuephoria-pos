// src/components/staff/RealTimeTimer.tsx
import React, { useState, useEffect } from 'react';
import { Clock, Coffee, DollarSign, TrendingUp } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface RealTimeTimerProps {
  clockInTime: string;
  breakStartTime?: string;
  breakDuration: number;
  hourlyRate: number;
  isOnBreak: boolean;
}

const RealTimeTimer: React.FC<RealTimeTimerProps> = ({
  clockInTime,
  breakStartTime,
  breakDuration,
  hourlyRate,
  isOnBreak
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const calculateStats = () => {
    try {
      const clockIn = new Date(clockInTime);
      const totalElapsedMs = currentTime.getTime() - clockIn.getTime();
      const totalElapsedHours = totalElapsedMs / (1000 * 60 * 60);

      let currentBreakMinutes = breakDuration || 0;
      if (isOnBreak && breakStartTime) {
        const breakStart = new Date(breakStartTime);
        const breakElapsedMs = currentTime.getTime() - breakStart.getTime();
        currentBreakMinutes += breakElapsedMs / (1000 * 60);
      }

      const workingHours = Math.max(0, totalElapsedHours - (currentBreakMinutes / 60));
      const earnings = workingHours * (hourlyRate || 0);

      return {
        hours: Math.floor(workingHours),
        minutes: Math.floor((workingHours % 1) * 60),
        seconds: Math.floor(((workingHours % 1) * 60 % 1) * 60),
        earnings: earnings,
        totalElapsed: {
          hours: Math.floor(totalElapsedHours),
          minutes: Math.floor((totalElapsedHours % 1) * 60),
          seconds: Math.floor(((totalElapsedHours % 1) * 60 % 1) * 60)
        },
        breakTime: {
          minutes: Math.floor(currentBreakMinutes),
          seconds: Math.floor((currentBreakMinutes % 1) * 60)
        }
      };
    } catch (error) {
      console.error('Error calculating stats:', error);
      return {
        hours: 0,
        minutes: 0,
        seconds: 0,
        earnings: 0,
        totalElapsed: { hours: 0, minutes: 0, seconds: 0 },
        breakTime: { minutes: 0, seconds: 0 }
      };
    }
  };

  const stats = calculateStats();

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Working Timer */}
      <Card className={`bg-gradient-to-br ${isOnBreak ? 'from-gray-600 to-gray-800' : 'from-green-600 to-green-800'} border-none shadow-lg`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-white" />
              <span className="text-white font-semibold">Working Time</span>
            </div>
            {isOnBreak && (
              <Badge variant="outline" className="text-white border-white animate-pulse">
                PAUSED
              </Badge>
            )}
          </div>
          
          <div className="text-center">
            <div className="text-5xl font-bold text-white mb-2 font-mono tracking-wider">
              {String(stats.hours).padStart(2, '0')}:
              {String(stats.minutes).padStart(2, '0')}:
              {String(stats.seconds).padStart(2, '0')}
            </div>
            <p className="text-white/80 text-sm">Hours worked today</p>
          </div>

          <div className="mt-4 pt-4 border-t border-white/20">
            <div className="flex justify-between text-sm">
              <span className="text-white/70">Total elapsed:</span>
              <span className="text-white font-semibold">
                {stats.totalElapsed.hours}h {stats.totalElapsed.minutes}m
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Earnings Timer */}
      <Card className={`bg-gradient-to-br ${isOnBreak ? 'from-gray-600 to-gray-800' : 'from-cuephoria-purple to-cuephoria-blue'} border-none shadow-lg`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-white" />
              <span className="text-white font-semibold">Live Earnings</span>
            </div>
            <TrendingUp className={`h-5 w-5 text-white ${!isOnBreak && 'animate-pulse'}`} />
          </div>
          
          <div className="text-center">
            <div className="text-5xl font-bold text-white mb-2 font-mono">
              ₹{stats.earnings.toFixed(2)}
            </div>
            <p className="text-white/80 text-sm">Earned so far today</p>
          </div>

          <div className="mt-4 pt-4 border-t border-white/20">
            <div className="flex justify-between text-sm">
              <span className="text-white/70">Hourly rate:</span>
              <span className="text-white font-semibold">₹{(hourlyRate || 0).toFixed(2)}/hr</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Break Timer (only show when on break) */}
      {isOnBreak && (
        <Card className="md:col-span-2 bg-gradient-to-br from-yellow-500 to-orange-600 border-none shadow-lg animate-pulse-slow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                  <Coffee className="h-6 w-6 text-white animate-bounce" />
                </div>
                <div>
                  <div className="text-white font-semibold text-lg">Break Time</div>
                  <div className="text-white/80 text-sm">Enjoy your break!</div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-4xl font-bold text-white font-mono">
                  {String(stats.breakTime.minutes).padStart(2, '0')}:
                  {String(stats.breakTime.seconds).padStart(2, '0')}
                </div>
                <p className="text-white/80 text-sm mt-1">Minutes on break</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RealTimeTimer;
