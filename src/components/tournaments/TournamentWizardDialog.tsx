import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Tournament,
  GameType,
  PoolGameVariant,
  TournamentFormat,
  DiscountCoupon,
} from '@/types/tournament.types';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { generateId } from '@/utils/pos.utils';
import TournamentFormatSelector from './TournamentFormatSelector';
import {
  Trophy,
  Calendar,
  Users,
  Sparkles,
  Gamepad2,
  DollarSign,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Ticket,
  X,
  Plus,
  Medal,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const STEPS = [
  { id: 'basics', label: 'Basics', icon: Trophy },
  { id: 'format', label: 'Format', icon: Sparkles },
  { id: 'game', label: 'Game', icon: Gamepad2 },
  { id: 'prizes', label: 'Prizes', icon: DollarSign },
  { id: 'review', label: 'Review', icon: CheckCircle2 },
] as const;

type StepId = (typeof STEPS)[number]['id'];

interface TournamentWizardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournament?: Tournament;
  locationId?: string | null;
  onSave: (tournament: Tournament) => void;
  canManage?: boolean;
}

const formatLabel: Record<string, string> = {
  knockout: 'Knockout',
  league: 'League',
  double_elimination: 'Double elimination',
  round_robin: 'Round robin',
  swiss: 'Swiss',
  custom: 'Custom bracket',
  time_trial: 'FIFA Time Trial',
};

export default function TournamentWizardDialog({
  open,
  onOpenChange,
  tournament,
  locationId = null,
  onSave,
  canManage = true,
}: TournamentWizardDialogProps) {
  const [step, setStep] = useState<StepId>('basics');
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [gameType, setGameType] = useState<GameType>('PS5');
  const [gameVariant, setGameVariant] = useState<PoolGameVariant | undefined>();
  const [gameTitle, setGameTitle] = useState('');
  const [tournamentFormat, setTournamentFormat] = useState<TournamentFormat>('knockout');
  const [maxPlayers, setMaxPlayers] = useState(16);
  const [budget, setBudget] = useState('');
  const [winnerPrize, setWinnerPrize] = useState('');
  const [runnerUpPrize, setRunnerUpPrize] = useState('');
  const [thirdPrize, setThirdPrize] = useState('');
  const [winnerPrizeText, setWinnerPrizeText] = useState('');
  const [runnerUpPrizeText, setRunnerUpPrizeText] = useState('');
  const [thirdPrizeText, setThirdPrizeText] = useState('');
  const [entryFee, setEntryFee] = useState('250');
  const [discountCoupons, setDiscountCoupons] = useState<DiscountCoupon[]>([]);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponType, setNewCouponType] = useState<'percentage' | 'fixed'>('percentage');
  const [newCouponDiscount, setNewCouponDiscount] = useState('');
  const [trackName, setTrackName] = useState('');
  const [maxAttempts, setMaxAttempts] = useState('3');

  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const isLastStep = step === 'review';
  const isFirstStep = step === 'basics';

  useEffect(() => {
    if (!open) {
      setStep('basics');
      return;
    }
    if (tournament) {
      setName(tournament.name);
      setDate(tournament.date);
      setGameType(tournament.gameType);
      setGameVariant(tournament.gameVariant);
      setGameTitle(tournament.gameTitle ?? '');
      setMaxPlayers(tournament.maxPlayers || 16);
      setBudget(tournament.budget?.toString() || '');
      setWinnerPrize(tournament.winnerPrize?.toString() || '');
      setRunnerUpPrize(tournament.runnerUpPrize?.toString() || '');
      setThirdPrize(tournament.thirdPrize?.toString() || '');
      setWinnerPrizeText(tournament.winnerPrizeText || '');
      setRunnerUpPrizeText(tournament.runnerUpPrizeText || '');
      setThirdPrizeText(tournament.thirdPrizeText || '');
      setTournamentFormat(tournament.tournamentFormat || 'knockout');
      setEntryFee(tournament.entryFee?.toString() || '250');
      setDiscountCoupons(tournament.discountCoupons || []);
      setTrackName(tournament.formatOptions?.trackName ?? '');
      setMaxAttempts(String(tournament.formatOptions?.maxAttempts ?? 3));
    } else {
      setName('');
      setDate(new Date().toISOString().split('T')[0]);
      setGameType('PS5');
      setGameVariant(undefined);
      setGameTitle('FIFA');
      setMaxPlayers(16);
      setBudget('');
      setWinnerPrize('');
      setRunnerUpPrize('');
      setThirdPrize('');
      setWinnerPrizeText('');
      setRunnerUpPrizeText('');
      setThirdPrizeText('');
      setTournamentFormat('time_trial');
      setEntryFee('250');
      setDiscountCoupons([]);
      setTrackName('');
      setMaxAttempts('3');
    }
    setStep('basics');
  }, [tournament, open]);

  useEffect(() => {
    if (gameType === 'PS5' && /fifa|fc\s*\d|ea\s*sports/i.test(gameTitle) && !tournament && step === 'format') {
      setTournamentFormat('time_trial');
    }
  }, [gameTitle, gameType, tournament, step]);

  const validateStep = (s: StepId): boolean => {
    if (s === 'basics') {
      if (!name.trim() || !date) {
        toast.error('Enter tournament name and date');
        return false;
      }
      return true;
    }
    if (s === 'format') return true;
    if (s === 'game') return true;
    if (s === 'prizes') return true;
    return true;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    const next = STEPS[stepIndex + 1];
    if (next) setStep(next.id);
  };

  const goBack = () => {
    const prev = STEPS[stepIndex - 1];
    if (prev) setStep(prev.id);
  };

  const buildTournament = (): Tournament | null => {
    const resolvedLocationId = tournament?.location_id ?? locationId ?? undefined;
    if (!resolvedLocationId) {
      toast.error('Select a branch in the header first.');
      return null;
    }
    return {
      id: tournament?.id || generateId(),
      name: name.trim(),
      date,
      gameType,
      gameVariant,
      gameTitle: gameType === 'PS5' ? gameTitle : undefined,
      players: tournament?.players || [],
      matches: tournament?.matches || [],
      lapTimes: tournament?.lapTimes || [],
      status: tournament?.status || 'upcoming',
      maxPlayers,
      budget: budget ? parseFloat(budget) : undefined,
      winnerPrize: winnerPrize ? parseFloat(winnerPrize) : undefined,
      runnerUpPrize: runnerUpPrize ? parseFloat(runnerUpPrize) : undefined,
      thirdPrize: thirdPrize ? parseFloat(thirdPrize) : undefined,
      winnerPrizeText: winnerPrizeText.trim() || undefined,
      runnerUpPrizeText: runnerUpPrizeText.trim() || undefined,
      thirdPrizeText: thirdPrizeText.trim() || undefined,
      tournamentFormat,
      entryFee: entryFee ? parseFloat(entryFee) : 250,
      discountCoupons,
      winner: tournament?.winner,
      runnerUp: tournament?.runnerUp,
      thirdPlace: tournament?.thirdPlace,
      formatOptions: {
        ...(tournament?.formatOptions || {}),
        ...(tournamentFormat === 'time_trial'
          ? {
              trackName: trackName.trim() || 'Time Trial',
              maxAttempts: parseInt(maxAttempts, 10) || 3,
              bestLapCount: 1,
            }
          : {}),
      },
      displayConfig: tournament?.displayConfig || { animationIntensity: 'full' },
      location_id: resolvedLocationId,
    };
  };

  const handleSubmit = () => {
    if (!canManage) return;
    const data = buildTournament();
    if (!data) return;
    onSave(data);
    onOpenChange(false);
  };

  const handleAddCoupon = () => {
    if (!newCouponCode.trim() || !newCouponDiscount.trim()) return;
    const discount = parseFloat(newCouponDiscount);
    if (discount <= 0 || (newCouponType === 'percentage' && discount > 100)) return;
    setDiscountCoupons([
      ...discountCoupons,
      {
        code: newCouponCode.trim().toUpperCase(),
        discount_type: newCouponType,
        discount_value: discount,
      },
    ]);
    setNewCouponCode('');
    setNewCouponDiscount('');
  };

  const reviewRows = useMemo(
    () => [
      { label: 'Name', value: name || '—' },
      { label: 'Date', value: date || '—' },
      { label: 'Format', value: formatLabel[tournamentFormat] ?? tournamentFormat },
      { label: 'Game', value: `${gameType}${gameTitle ? ` · ${gameTitle}` : ''}` },
      { label: 'Capacity', value: `${maxPlayers} players` },
      { label: 'Entry fee', value: `₹${entryFee || '0'}` },
      ...(tournamentFormat === 'time_trial'
        ? [{ label: 'Track', value: trackName || 'Time Trial' }]
        : []),
    ],
    [name, date, tournamentFormat, gameType, gameTitle, maxPlayers, entryFee, trackName],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] p-0 gap-0 overflow-hidden border-white/10 bg-[#0a0a12]/95 backdrop-blur-xl text-white shadow-2xl">
        {/* Header + stepper */}
        <div className="border-b border-white/10 px-6 pt-6 pb-4 bg-gradient-to-r from-purple-950/40 via-transparent to-cyan-950/30">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <p className="text-xs uppercase tracking-widest text-primary/70 font-semibold mb-1">
                {tournament ? 'Edit tournament' : 'New tournament wizard'}
              </p>
              <h2 className="text-2xl font-bold">
                {tournament ? 'Update event settings' : 'Launch your next event'}
              </h2>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              Step {stepIndex + 1} of {STEPS.length}
            </div>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const active = s.id === step;
              const done = i < stepIndex;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => i <= stepIndex && setStep(s.id)}
                  className={cn(
                    'flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all',
                    active && 'bg-primary/20 text-white border border-primary/40',
                    done && !active && 'text-emerald-300/90',
                    !active && !done && 'text-muted-foreground',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {s.label}
                  {i < STEPS.length - 1 && (
                    <ChevronRight className="h-3 w-3 opacity-30 hidden sm:inline" />
                  )}
                </button>
              );
            })}
          </div>
          <div className="mt-3 h-1 rounded-full bg-white/5 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 to-cyan-400"
              initial={false}
              animate={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
              transition={{ duration: 0.35 }}
            />
          </div>
        </div>

        {/* Step content — fixed height, no long scroll */}
        <div className="px-6 py-6 min-h-[380px] max-h-[min(52vh,480px)] overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              {step === 'basics' && (
                <div className="space-y-6 max-w-xl">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Event basics</h3>
                    <p className="text-sm text-muted-foreground">
                      Name your tournament and set when it runs at this branch.
                    </p>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Tournament name *</Label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Friday FIFA Time Trial"
                        className="h-12 text-lg theme-inset"
                        autoFocus
                      />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-emerald-400" /> Date *
                        </Label>
                        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11 theme-inset" />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-blue-400" /> Max players
                        </Label>
                        <Input
                          type="number"
                          min={2}
                          max={64}
                          value={maxPlayers}
                          onChange={(e) => setMaxPlayers(parseInt(e.target.value, 10) || 16)}
                          className="h-11 theme-inset"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === 'format' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Choose format</h3>
                    <p className="text-sm text-muted-foreground">
                      Brackets for head-to-head · Time trial for fastest lap wins.
                    </p>
                  </div>
                  <TournamentFormatSelector
                    selectedFormat={tournamentFormat}
                    onFormatChange={setTournamentFormat}
                    maxPlayers={maxPlayers}
                    gameTitle={gameTitle}
                    compact
                  />
                  {tournamentFormat === 'time_trial' && (
                    <div className="grid sm:grid-cols-2 gap-4 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
                      <div className="space-y-2">
                        <Label className="text-emerald-200">Track / mode</Label>
                        <Input value={trackName} onChange={(e) => setTrackName(e.target.value)} placeholder="Monaco Sprint" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-emerald-200">Max attempts</Label>
                        <Input type="number" min={1} max={20} value={maxAttempts} onChange={(e) => setMaxAttempts(e.target.value)} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {step === 'game' && (
                <div className="space-y-6 max-w-xl">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Game setup</h3>
                    <p className="text-sm text-muted-foreground">What are players competing on?</p>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Platform</Label>
                      <Select value={gameType} onValueChange={(v: GameType) => setGameType(v)}>
                        <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PS5">PlayStation 5</SelectItem>
                          <SelectItem value="Pool">Pool / Billiards</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {gameType === 'Pool' ? (
                      <div className="space-y-2">
                        <Label>Variant</Label>
                        <Select value={gameVariant ?? ''} onValueChange={(v: PoolGameVariant) => setGameVariant(v)}>
                          <SelectTrigger className="h-11"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="8 Ball">8 Ball</SelectItem>
                            <SelectItem value="Snooker">Snooker</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label>Game title</Label>
                        <Input value={gameTitle} onChange={(e) => setGameTitle(e.target.value)} placeholder="FIFA, COD…" className="h-11" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {step === 'prizes' && (
                <div className="space-y-5 max-w-2xl">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Prizes & registration</h3>
                    <p className="text-sm text-muted-foreground">Optional — shown on your public page.</p>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Entry fee (₹)</Label>
                      <Input value={entryFee} onChange={(e) => setEntryFee(e.target.value)} type="number" min={0} />
                    </div>
                    <div className="space-y-2">
                      <Label>Total budget (₹)</Label>
                      <Input value={budget} onChange={(e) => setBudget(e.target.value)} type="number" min={0} />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-3">
                    {[
                      { label: '1st', val: winnerPrize, set: setWinnerPrize, text: winnerPrizeText, setText: setWinnerPrizeText, icon: Trophy, color: 'amber' },
                      { label: '2nd', val: runnerUpPrize, set: setRunnerUpPrize, text: runnerUpPrizeText, setText: setRunnerUpPrizeText, icon: Medal, color: 'slate' },
                      { label: '3rd', val: thirdPrize, set: setThirdPrize, text: thirdPrizeText, setText: setThirdPrizeText, icon: Medal, color: 'orange' },
                    ].map((p) => (
                      <div key={p.label} className="rounded-xl border border-white/10 p-3 space-y-2 bg-white/[0.02]">
                        <Label className="text-xs uppercase opacity-70">{p.label} place ₹</Label>
                        <Input value={p.val} onChange={(e) => p.set(e.target.value)} type="number" placeholder="0" />
                        <Input value={p.text} onChange={(e) => p.setText(e.target.value)} placeholder="Bonus prize text" className="text-xs" />
                      </div>
                    ))}
                  </div>
                  <div className="rounded-xl border border-white/10 p-4 space-y-3">
                    <Label className="flex items-center gap-2"><Ticket className="h-4 w-4" /> Discount coupons</Label>
                    {discountCoupons.map((c, i) => (
                      <div key={i} className="flex justify-between text-sm py-1 border-b border-white/5 last:border-0">
                        <span className="font-mono text-emerald-300">{c.code}</span>
                        <button type="button" onClick={() => setDiscountCoupons(discountCoupons.filter((_, j) => j !== i))}>
                          <X className="h-4 w-4 text-red-400" />
                        </button>
                      </div>
                    ))}
                    <div className="flex gap-2 flex-wrap">
                      <Input placeholder="CODE" value={newCouponCode} onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())} className="w-24" />
                      <Input placeholder="%" value={newCouponDiscount} onChange={(e) => setNewCouponDiscount(e.target.value)} className="w-20" type="number" />
                      <Button type="button" size="sm" variant="outline" onClick={handleAddCoupon}><Plus className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </div>
              )}

              {step === 'review' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Ready to launch</h3>
                    <p className="text-sm text-muted-foreground">Review everything before going live.</p>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {reviewRows.map((row) => (
                      <div key={row.label} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{row.label}</p>
                        <p className="font-semibold mt-0.5">{row.value}</p>
                      </div>
                    ))}
                  </div>
                  {discountCoupons.length > 0 && (
                    <p className="text-sm text-muted-foreground">{discountCoupons.length} coupon(s) configured</p>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 px-6 py-4 flex items-center justify-between gap-3 bg-black/30">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <div className="flex gap-2">
            {!isFirstStep && (
              <Button type="button" variant="outline" onClick={goBack} className="gap-1">
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
            )}
            {!isLastStep ? (
              <Button type="button" onClick={goNext} className="btn-gradient gap-1">
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="button" onClick={handleSubmit} disabled={!canManage} className="btn-gradient gap-2">
                <CheckCircle2 className="h-4 w-4" />
                {tournament ? 'Save changes' : 'Create tournament'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
