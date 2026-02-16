
import React, { useState, useEffect } from 'react';
import { Tournament, GameType, PoolGameVariant, PS5GameTitle, TournamentFormat, DiscountCoupon } from '@/types/tournament.types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { generateId } from '@/utils/pos.utils';
import { Separator } from '@/components/ui/separator';
import TournamentFormatSelector from './TournamentFormatSelector';
import { Trophy, Calendar, Users, Settings, DollarSign, Sparkles, Ticket, X, Plus } from 'lucide-react';

interface TournamentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournament?: Tournament;
  onSave: (tournament: Tournament) => void;
}

const TournamentDialog: React.FC<TournamentDialogProps> = ({
  open,
  onOpenChange,
  tournament,
  onSave
}) => {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [gameType, setGameType] = useState<GameType>('PS5');
  const [gameVariant, setGameVariant] = useState<PoolGameVariant | undefined>(undefined);
  const [gameTitle, setGameTitle] = useState('');
  
  const [tournamentFormat, setTournamentFormat] = useState<TournamentFormat>('knockout');
  
  const [maxPlayers, setMaxPlayers] = useState(16);
  const [budget, setBudget] = useState('');
  const [winnerPrize, setWinnerPrize] = useState('');
  const [runnerUpPrize, setRunnerUpPrize] = useState('');
  const [entryFee, setEntryFee] = useState('250');
  const [discountCoupons, setDiscountCoupons] = useState<DiscountCoupon[]>([]);
  
  // Coupon form fields
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponDiscount, setNewCouponDiscount] = useState('');
  const [newCouponDescription, setNewCouponDescription] = useState('');

  // Reset form when dialog opens/closes or tournament changes
  useEffect(() => {
    if (tournament) {
      setName(tournament.name);
      setDate(tournament.date);
      setGameType(tournament.gameType);
      setGameVariant(tournament.gameVariant);
      setGameTitle(tournament.gameTitle);
      setMaxPlayers(tournament.maxPlayers || 16);
      setBudget(tournament.budget?.toString() || '');
      setWinnerPrize(tournament.winnerPrize?.toString() || '');
      setRunnerUpPrize(tournament.runnerUpPrize?.toString() || '');
      setTournamentFormat(tournament.tournamentFormat || 'knockout');
      setEntryFee(tournament.entryFee?.toString() || '250');
      setDiscountCoupons(tournament.discountCoupons || []);
    } else {
      // Reset form
      setName('');
      setDate('');
      setGameType('PS5');
      setGameVariant(undefined);
      setGameTitle('');
      setMaxPlayers(16);
      setBudget('');
      setWinnerPrize('');
      setRunnerUpPrize('');
      setTournamentFormat('knockout');
      setEntryFee('250');
      setDiscountCoupons([]);
    }
    // Reset coupon form fields
    setNewCouponCode('');
    setNewCouponDiscount('');
    setNewCouponDescription('');
  }, [tournament, open]);

  const handleAddCoupon = () => {
    if (!newCouponCode.trim() || !newCouponDiscount.trim()) {
      return;
    }

    const discount = parseFloat(newCouponDiscount);
    if (discount <= 0 || discount > 100) {
      return;
    }

    const newCoupon: DiscountCoupon = {
      code: newCouponCode.trim().toUpperCase(),
      discount_percentage: discount,
      description: newCouponDescription.trim() || undefined
    };

    setDiscountCoupons([...discountCoupons, newCoupon]);
    setNewCouponCode('');
    setNewCouponDiscount('');
    setNewCouponDescription('');
  };

  const handleRemoveCoupon = (index: number) => {
    setDiscountCoupons(discountCoupons.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !date) {
      return;
    }

    const tournamentData: Tournament = {
      id: tournament?.id || generateId(),
      name,
      date,
      gameType,
      gameVariant,
      gameTitle: gameType === 'PS5' ? gameTitle : undefined,
      players: tournament?.players || [],
      matches: tournament?.matches || [],
      status: tournament?.status || 'upcoming',
      maxPlayers,
      budget: budget ? parseFloat(budget) : undefined,
      winnerPrize: winnerPrize ? parseFloat(winnerPrize) : undefined,
      runnerUpPrize: runnerUpPrize ? parseFloat(runnerUpPrize) : undefined,
      tournamentFormat,
      entryFee: entryFee ? parseFloat(entryFee) : 250,
      discountCoupons: discountCoupons,
      winner: tournament?.winner,
      runnerUp: tournament?.runnerUp,
    };

    onSave(tournamentData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[95vh] overflow-y-auto bg-gradient-to-br from-gray-950/95 to-gray-900/95 border-gray-700/60 backdrop-blur-sm shadow-2xl animate-scale-in">
        <DialogHeader className="pb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-xl border border-purple-500/30">
              <Trophy className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold text-white">
                {tournament ? 'Edit Tournament' : 'Create New Tournament'}
              </DialogTitle>
              <p className="text-gray-400 text-sm mt-1">
                {tournament ? 'Modify tournament settings and configuration' : 'Set up a new competitive tournament'}
              </p>
            </div>
          </div>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information Section */}
          <div className="space-y-6 p-6 bg-gradient-to-r from-gray-800/40 to-gray-700/40 rounded-xl border border-gray-700/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Settings className="h-5 w-5 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Basic Information</h3>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="name" className="text-gray-200 font-medium flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-purple-400" />
                  Tournament Name *
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter tournament name"
                  required
                  className="bg-gray-800/60 border-gray-600/60 text-white placeholder-gray-400 focus:border-purple-500/80 focus:ring-purple-500/20 rounded-xl px-4 py-3 h-auto transition-all duration-200"
                />
              </div>
              
              <div className="space-y-3">
                <Label htmlFor="date" className="text-gray-200 font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-green-400" />
                  Tournament Date *
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="bg-gray-800/60 border-gray-600/60 text-white focus:border-green-500/80 focus:ring-green-500/20 rounded-xl px-4 py-3 h-auto transition-all duration-200"
                />
              </div>
            </div>
            
            <div className="space-y-3">
              <Label htmlFor="maxPlayers" className="text-gray-200 font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-400" />
                Maximum Players
              </Label>
              <Input
                id="maxPlayers"
                type="number"
                min="2"
                max="64"
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(parseInt(e.target.value) || 16)}
                placeholder="16"
                className="bg-gray-800/60 border-gray-600/60 text-white placeholder-gray-400 focus:border-blue-500/80 focus:ring-blue-500/20 rounded-xl px-4 py-3 h-auto transition-all duration-200 max-w-xs"
              />
            </div>
          </div>

          <Separator className="bg-gray-700/50" />

          {/* Tournament Format Section */}
          <div className="space-y-6 p-6 bg-gradient-to-r from-gray-800/40 to-gray-700/40 rounded-xl border border-gray-700/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Sparkles className="h-5 w-5 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Tournament Format</h3>
            </div>
            <TournamentFormatSelector
              selectedFormat={tournamentFormat}
              onFormatChange={setTournamentFormat}
              maxPlayers={maxPlayers}
            />
          </div>

          <Separator className="bg-gray-700/50" />

          {/* Game Configuration Section */}
          <div className="space-y-6 p-6 bg-gradient-to-r from-gray-800/40 to-gray-700/40 rounded-xl border border-gray-700/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Trophy className="h-5 w-5 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Game Configuration</h3>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="gameType" className="text-gray-200 font-medium">Game Type *</Label>
                <Select value={gameType} onValueChange={(value: GameType) => setGameType(value)}>
                  <SelectTrigger className="bg-gray-800/60 border-gray-600/60 text-white focus:border-green-500/80 rounded-xl px-4 py-3 h-auto">
                    <SelectValue placeholder="Select game type" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900/95 border-gray-700/60 backdrop-blur-sm">
                    <SelectItem value="PS5" className="text-white hover:bg-gray-800/80 focus:bg-gray-800/80">PlayStation 5</SelectItem>
                    <SelectItem value="Pool" className="text-white hover:bg-gray-800/80 focus:bg-gray-800/80">Pool/Billiards</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {gameType === 'Pool' && (
                <div className="space-y-3">
                  <Label htmlFor="gameVariant" className="text-gray-200 font-medium">Pool Variant</Label>
                  <Select value={gameVariant || ''} onValueChange={(value: PoolGameVariant) => setGameVariant(value)}>
                    <SelectTrigger className="bg-gray-800/60 border-gray-600/60 text-white focus:border-green-500/80 rounded-xl px-4 py-3 h-auto">
                      <SelectValue placeholder="Select pool variant" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900/95 border-gray-700/60 backdrop-blur-sm">
                      <SelectItem value="8 Ball" className="text-white hover:bg-gray-800/80 focus:bg-gray-800/80">8 Ball</SelectItem>
                      <SelectItem value="Snooker" className="text-white hover:bg-gray-800/80 focus:bg-gray-800/80">Snooker</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {gameType === 'PS5' && (
                <div className="space-y-3">
                  <Label htmlFor="gameTitle" className="text-gray-200 font-medium">Game Title</Label>
                  <Input
                    id="gameTitle"
                    value={gameTitle}
                    onChange={(e) => setGameTitle(e.target.value)}
                    placeholder="e.g., FIFA, COD, etc."
                    className="bg-gray-800/60 border-gray-600/60 text-white placeholder-gray-400 focus:border-green-500/80 focus:ring-green-500/20 rounded-xl px-4 py-3 h-auto transition-all duration-200"
                  />
                </div>
              )}
            </div>
          </div>

          <Separator className="bg-gray-700/50" />

          {/* Budget and Prizes Section */}
          <div className="space-y-6 p-6 bg-gradient-to-r from-gray-800/40 to-gray-700/40 rounded-xl border border-gray-700/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <DollarSign className="h-5 w-5 text-yellow-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Budget & Prizes</h3>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-3">
                <Label htmlFor="budget" className="text-gray-200 font-medium">Total Budget (₹)</Label>
                <Input
                  id="budget"
                  type="number"
                  min="0"
                  step="0.01"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="0.00"
                  className="bg-gray-800/60 border-gray-600/60 text-white placeholder-gray-400 focus:border-yellow-500/80 focus:ring-yellow-500/20 rounded-xl px-4 py-3 h-auto transition-all duration-200"
                />
              </div>
              
              <div className="space-y-3">
                <Label htmlFor="winnerPrize" className="text-gray-200 font-medium">Winner Prize (₹)</Label>
                <Input
                  id="winnerPrize"
                  type="number"
                  min="0"
                  step="0.01"
                  value={winnerPrize}
                  onChange={(e) => setWinnerPrize(e.target.value)}
                  placeholder="0.00"
                  className="bg-gray-800/60 border-gray-600/60 text-white placeholder-gray-400 focus:border-yellow-500/80 focus:ring-yellow-500/20 rounded-xl px-4 py-3 h-auto transition-all duration-200"
                />
              </div>
              
              <div className="space-y-3">
                <Label htmlFor="runnerUpPrize" className="text-gray-200 font-medium">Runner-up Prize (₹)</Label>
                <Input
                  id="runnerUpPrize"
                  type="number"
                  min="0"
                  step="0.01"
                  value={runnerUpPrize}
                  onChange={(e) => setRunnerUpPrize(e.target.value)}
                  placeholder="0.00"
                  className="bg-gray-800/60 border-gray-600/60 text-white placeholder-gray-400 focus:border-yellow-500/80 focus:ring-yellow-500/20 rounded-xl px-4 py-3 h-auto transition-all duration-200"
                />
              </div>
            </div>
          </div>

          <Separator className="bg-gray-700/50" />

          {/* Entry Fee & Discount Coupons Section */}
          <div className="space-y-6 p-6 bg-gradient-to-r from-gray-800/40 to-gray-700/40 rounded-xl border border-gray-700/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Ticket className="h-5 w-5 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Registration Fee & Discounts</h3>
            </div>
            
            {/* Entry Fee */}
            <div className="space-y-3">
              <Label htmlFor="entryFee" className="text-gray-200 font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-400" />
                Entry Fee (₹) *
              </Label>
              <Input
                id="entryFee"
                type="number"
                min="0"
                step="1"
                value={entryFee}
                onChange={(e) => setEntryFee(e.target.value)}
                placeholder="250"
                className="bg-gray-800/60 border-gray-600/60 text-white placeholder-gray-400 focus:border-green-500/80 focus:ring-green-500/20 rounded-xl px-4 py-3 h-auto transition-all duration-200 max-w-xs"
              />
              <p className="text-xs text-gray-400">Base entry fee before any discounts</p>
            </div>

            {/* Discount Coupons */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-gray-200 font-medium">Discount Coupons</Label>
                <span className="text-xs text-gray-400">{discountCoupons.length} coupon(s)</span>
              </div>

              {/* Existing Coupons */}
              {discountCoupons.length > 0 && (
                <div className="space-y-2">
                  {discountCoupons.map((coupon, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-800/60 border border-gray-600/40 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-green-400">{coupon.code}</span>
                          <span className="text-yellow-400 font-semibold">{coupon.discount_percentage}% OFF</span>
                        </div>
                        {coupon.description && (
                          <p className="text-xs text-gray-400 mt-1">{coupon.description}</p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveCoupon(index)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Coupon Form */}
              <div className="space-y-3 p-4 bg-gray-800/40 rounded-lg border border-gray-600/30">
                <Label className="text-gray-300 text-sm font-semibold">Add New Coupon</Label>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  <Input
                    placeholder="Coupon Code (e.g., SAVE20)"
                    value={newCouponCode}
                    onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                    className="bg-gray-800/60 border-gray-600/60 text-white placeholder-gray-400 focus:border-green-500/80 rounded-lg px-3 py-2 h-auto"
                  />
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    placeholder="Discount %"
                    value={newCouponDiscount}
                    onChange={(e) => setNewCouponDiscount(e.target.value)}
                    className="bg-gray-800/60 border-gray-600/60 text-white placeholder-gray-400 focus:border-green-500/80 rounded-lg px-3 py-2 h-auto"
                  />
                  <Input
                    placeholder="Description (optional)"
                    value={newCouponDescription}
                    onChange={(e) => setNewCouponDescription(e.target.value)}
                    className="bg-gray-800/60 border-gray-600/60 text-white placeholder-gray-400 focus:border-green-500/80 rounded-lg px-3 py-2 h-auto"
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleAddCoupon}
                  disabled={!newCouponCode.trim() || !newCouponDiscount.trim()}
                  className="w-full bg-green-600/80 hover:bg-green-600 text-white rounded-lg"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Coupon
                </Button>
              </div>
            </div>
          </div>
        </form>
        
        <DialogFooter className="pt-6 flex-col sm:flex-row gap-3">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="border-gray-600/60 bg-gray-800/40 text-gray-300 hover:bg-gray-700/60 hover:border-gray-500/80 px-8 py-3 rounded-xl transition-all duration-200 font-medium"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            onClick={handleSubmit}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105"
          >
            {tournament ? 'Update Tournament' : 'Create Tournament'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TournamentDialog;
