'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import useLocalStorage from '@/hooks/useLocalStorage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
  TableCaption,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { toast } from 'sonner';
import { Trash2, PlusCircle, TrendingUp, Settings, Info, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

// Define the possible outcomes of a trade
type TradeOutcome = 'win' | 'partial win' | 'loss' | 'breakeven' | 'pending';

// Define the structure of a trade object
interface Trade {
  id: string;
  tradeNumber: number;
  accountSize: number; // Starting balance for this trade
  riskPercentage: number;
  riskAmount: number; // Calculated: accountSize * riskPercentage / 100
  outcome: TradeOutcome;
  winMultiplier: number; // R:R ratio for wins
  floatingPL: number; // Calculated based on outcome
  accountBalance: number; // Calculated: accountSize + floatingPL
  distanceToTarget: number; // Calculated: profitTarget - accountBalance
  nextSuggestedRisk?: number; // Calculated: Risk % needed for the *next* trade to hit target
}

// Helper function to format currency
const formatCurrency = (amount: number): string => {
    if (isNaN(amount)) return '$0.00';
    return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

// Helper function to format percentage precisely (for calculated risks)
const formatPercentagePrecise = (amount: number | undefined): string => {
    if (amount === undefined || isNaN(amount) || !isFinite(amount) || amount <= 0) return '-'; // Return dash if not applicable/calculable
    return `${amount.toFixed(3)}%`;
};

const TradingCalculator: React.FC = () => {
  const [hasMounted, setHasMounted] = useState(false);
  const [initialBalanceStr, setInitialBalanceStr] = useLocalStorage<string>('initialBalance', '10000');
  const [profitTargetStr, setProfitTargetStr] = useLocalStorage<string>('profitTarget', '');
  const [defaultRiskPercentageStr, setDefaultRiskPercentageStr] = useLocalStorage<string>('defaultRiskPercentage', '1.23');
  const [defaultWinMultiplierStr, setDefaultWinMultiplierStr] = useLocalStorage<string>('defaultWinMultiplier', '6.5');
  const [trades, setTrades] = useLocalStorage<Trade[]>('tradesLog', []);

  const initialBalance = useMemo(() => parseFloat(initialBalanceStr) || 0, [initialBalanceStr]);
  const defaultRiskPercentage = useMemo(() => parseFloat(defaultRiskPercentageStr) || 0, [defaultRiskPercentageStr]);
  const defaultWinMultiplier = useMemo(() => parseFloat(defaultWinMultiplierStr) || 0, [defaultWinMultiplierStr]);

  const profitTarget = useMemo(() => {
    const userTarget = parseFloat(profitTargetStr);
    return !isNaN(userTarget) && userTarget > 0 ? userTarget : initialBalance * 1.08;
  }, [initialBalance, profitTargetStr]);

  const [currentSuggestedRisk, setCurrentSuggestedRisk] = useState<number>(0);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const calculateTradeRow = useCallback((trade: Trade, previousBalance: number, target: number): Omit<Trade, 'nextSuggestedRisk'> => {
    const accountSize = previousBalance;
    const riskPercentage = trade.riskPercentage;
    const winMultiplier = trade.winMultiplier;
    const outcome = trade.outcome;
    const riskAmount = accountSize * (riskPercentage / 100);
    let floatingPL = 0;

    switch (outcome) {
      case 'win': floatingPL = riskAmount * winMultiplier; break;
      case 'loss': floatingPL = -riskAmount; break;
      case 'partial win': floatingPL = (riskAmount * winMultiplier) / 2; break;
      default: floatingPL = 0;
    }

    const accountBalance = accountSize + floatingPL;
    const distanceToTarget = target - accountBalance;

    return {
      ...trade,
      accountSize,
      riskAmount: isNaN(riskAmount) ? 0 : riskAmount,
      floatingPL: isNaN(floatingPL) ? 0 : floatingPL,
      accountBalance: isNaN(accountBalance) ? accountSize : accountBalance,
      distanceToTarget: isNaN(distanceToTarget) ? target - accountSize : distanceToTarget,
    };
  }, []);

  const calculateNextRisk = useCallback((currentBal: number, target: number, multiplier: number): number | undefined => {
      const remainingNeeded = target - currentBal;
      if (remainingNeeded <= 0 || currentBal <= 0 || multiplier <= 0) {
          return undefined;
      }
      const risk = (remainingNeeded / (currentBal * multiplier)) * 100;
      return isNaN(risk) || !isFinite(risk) ? undefined : risk;
  }, []);

  const recalculateTrades = useCallback((currentTrades: Trade[]): Trade[] => {
    let cumulativeBalance = initialBalance;
    return currentTrades.map((trade, index) => {
      const calculatedCoreTrade = calculateTradeRow(trade, cumulativeBalance, profitTarget);
      cumulativeBalance = calculatedCoreTrade.accountBalance;
      const nextRisk = calculateNextRisk(cumulativeBalance, profitTarget, defaultWinMultiplier);
      return {
          ...calculatedCoreTrade,
          tradeNumber: index + 1,
          nextSuggestedRisk: nextRisk,
      };
    });
  }, [initialBalance, profitTarget, defaultWinMultiplier, calculateTradeRow, calculateNextRisk]);

  const currentBalance = useMemo(() => {
      return trades.length > 0 ? trades[trades.length - 1].accountBalance : initialBalance;
  }, [trades, initialBalance]);

  useEffect(() => {
    if (!hasMounted) return;
    const risk = calculateNextRisk(currentBalance, profitTarget, defaultWinMultiplier);
    setCurrentSuggestedRisk(risk ?? 0);
  }, [currentBalance, profitTarget, defaultWinMultiplier, hasMounted, calculateNextRisk]);

   useEffect(() => {
     if (!hasMounted) return;
     const recalculated = recalculateTrades(trades);
     if (JSON.stringify(recalculated) !== JSON.stringify(trades)) {
         setTrades(recalculated);
     }
   }, [initialBalance, profitTarget, defaultWinMultiplier, trades, recalculateTrades, setTrades, hasMounted]);

  const handleAddTrade = useCallback(() => {
    const lastBalance = trades.length > 0 ? trades[trades.length - 1].accountBalance : initialBalance;
    const currentRisk = calculateNextRisk(lastBalance, profitTarget, defaultWinMultiplier);
    const riskToUse = (currentRisk !== undefined && currentRisk > 0 && currentRisk < 50) ? currentRisk : defaultRiskPercentage;
    const newTradeInput: Omit<Trade, 'tradeNumber' | 'accountSize' | 'riskAmount' | 'floatingPL' | 'accountBalance' | 'distanceToTarget' | 'nextSuggestedRisk'> = {
      id: uuidv4(),
      riskPercentage: riskToUse,
      outcome: 'pending',
      winMultiplier: defaultWinMultiplier,
    };
    setTrades((prevTrades) => [...prevTrades, newTradeInput as Trade]);
    toast.success(`Trade #${trades.length + 1} added.`);
  }, [trades, initialBalance, defaultRiskPercentage, defaultWinMultiplier, profitTarget, setTrades, calculateNextRisk]);

  const handleDeleteTrade = useCallback((id: string) => {
    setTrades((prevTrades) => prevTrades.filter((trade) => trade.id !== id));
    toast.warning('Trade deleted and log recalculated.');
  }, [setTrades]);

  const handleUpdateTradeOutcome = useCallback((id: string, newOutcome: TradeOutcome) => {
    let outcomeChanged = false;
    setTrades((prevTrades) =>
        prevTrades.map(trade => {
            if (trade.id === id && trade.outcome !== newOutcome) {
                outcomeChanged = true;
                return { ...trade, outcome: newOutcome };
            }
            return trade;
        })
    );
    if (outcomeChanged) toast.info('Trade outcome updated and log recalculated.');
  }, [setTrades]);

   const handleUpdateTradeValue = useCallback((id: string, field: 'riskPercentage' | 'winMultiplier', value: string) => {
     const numericValue = parseFloat(value);
     if (isNaN(numericValue) || numericValue < 0) {
       toast.error(`Invalid ${field === 'riskPercentage' ? 'Risk %' : 'Win Multiplier'} value.`);
       return;
     }
     let valueChanged = false;
     setTrades((prevTrades) =>
         prevTrades.map(trade => {
             if (trade.id === id && trade[field] !== numericValue) {
                 valueChanged = true;
                 return { ...trade, [field]: numericValue };
             }
             return trade;
         })
     );
     if (valueChanged) toast.info(`Trade ${field === 'riskPercentage' ? 'Risk %' : 'Win Multiplier'} updated and log recalculated.`);
   }, [setTrades]);

  const handleClearTrades = useCallback(() => {
    setTrades([]);
    toast.success('All trades cleared.');
  }, [setTrades]);

   const handlePositiveNumberChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^[0-9]*\.?[0-9]*$/.test(value)) {
      setter(value);
    }
  };

   const totalPL = currentBalance - initialBalance;
   const distanceToTargetFinal = profitTarget - currentBalance;

   if (!hasMounted) {
     return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center">
            <p className="text-gray-400">Loading Calculator...</p>
        </div>
     );
   }

  return (
    <TooltipProvider>
    <div className="min-h-screen bg-gray-950 text-gray-200 p-4 md:p-8 space-y-8 font-sans">
      <motion.h1
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="text-4xl font-bold text-center mb-8 bg-gradient-to-r from-blue-400 to-blue-600 text-transparent bg-clip-text"
      >
        Trading Growth Calculator
      </motion.h1>

       <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2, duration: 0.5 }}>
         <Card className="shadow-xl bg-gray-900 border border-gray-700 rounded-lg">
          <CardHeader className="border-b border-gray-700 pb-4">
            <div className="flex items-center space-x-3">
                <Settings className="h-6 w-6 text-blue-400" />
                <CardTitle className="text-xl text-gray-100">Configuration</CardTitle>
            </div>
            <CardDescription className="text-gray-400 pt-1">Set starting parameters, target, and default trade settings.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-6">
             <div className="space-y-2">
              <Label htmlFor="initialBalance" className="text-sm font-medium text-gray-400 flex items-center">
                Initial Balance ($)
                <Tooltip delayDuration={100}>
                    <TooltipTrigger asChild><Info className="h-3 w-3 ml-1.5 text-gray-500 cursor-help" /></TooltipTrigger>
                    <TooltipContent className="bg-gray-800 text-gray-200 border-gray-600 rounded shadow-lg"><p>Your starting capital.</p></TooltipContent>
                </Tooltip>
              </Label>
              <Input
                id="initialBalance"
                type="text" inputMode="decimal"
                value={initialBalanceStr}
                onChange={handlePositiveNumberChange(setInitialBalanceStr)}
                placeholder="e.g., 10000"
                className="bg-gray-800 border-gray-600 text-gray-100 focus:border-blue-500 focus:ring-blue-500 rounded-md shadow-sm"
              />
            </div>
             <div className="space-y-2">
               <Label htmlFor="profitTarget" className="text-sm font-medium text-gray-400 flex items-center">
                   Profit Target ($)
                    <Tooltip delayDuration={100}>
                        <TooltipTrigger asChild><Info className="h-3 w-3 ml-1.5 text-gray-500 cursor-help" /></TooltipTrigger>
                        <TooltipContent className="bg-gray-800 text-gray-200 border-gray-600 rounded shadow-lg"><p>Desired end balance. Defaults to 8% growth if empty.</p></TooltipContent>
                    </Tooltip>
               </Label>
              <Input
                id="profitTarget"
                type="text" inputMode="decimal"
                value={profitTargetStr}
                onChange={handlePositiveNumberChange(setProfitTargetStr)}
                placeholder={`e.g., ${formatCurrency(initialBalance * 1.08)} (8%)`}
                className="bg-gray-800 border-gray-600 text-gray-100 focus:border-blue-500 focus:ring-blue-500 rounded-md shadow-sm"
              />
            </div>
             <div className="space-y-2">
              <Label htmlFor="defaultRisk" className="text-sm font-medium text-gray-400 flex items-center">
                Default Risk (%)
                 <Tooltip delayDuration={100}>
                    <TooltipTrigger asChild><Info className="h-3 w-3 ml-1.5 text-gray-500 cursor-help" /></TooltipTrigger>
                    <TooltipContent className="bg-gray-800 text-gray-200 border-gray-600 rounded shadow-lg"><p>Default risk per trade. Can be edited per trade below.</p></TooltipContent>
                 </Tooltip>
              </Label>
              <Input
                id="defaultRisk"
                type="text" inputMode="decimal"
                value={defaultRiskPercentageStr}
                onChange={handlePositiveNumberChange(setDefaultRiskPercentageStr)}
                placeholder="e.g., 1.23"
                className="bg-gray-800 border-gray-600 text-gray-100 focus:border-blue-500 focus:ring-blue-500 rounded-md shadow-sm"
              />
            </div>
             <div className="space-y-2">
              <Label htmlFor="defaultWinMultiplier" className="text-sm font-medium text-gray-400 flex items-center">
                Default Win Multiplier (R)
                 <Tooltip delayDuration={100}>
                    <TooltipTrigger asChild><Info className="h-3 w-3 ml-1.5 text-gray-500 cursor-help" /></TooltipTrigger>
                    <TooltipContent className="bg-gray-800 text-gray-200 border-gray-600 rounded shadow-lg"><p>Default Reward:Risk ratio for winning trades.</p></TooltipContent>
                 </Tooltip>
              </Label>
              <Input
                id="defaultWinMultiplier"
                type="text" inputMode="decimal"
                value={defaultWinMultiplierStr}
                onChange={handlePositiveNumberChange(setDefaultWinMultiplierStr)}
                placeholder="e.g., 6.5"
                className="bg-gray-800 border-gray-600 text-gray-100 focus:border-blue-500 focus:ring-blue-500 rounded-md shadow-sm"
              />
            </div>
          </CardContent>
            <CardFooter className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-4 border-t border-gray-700 mt-4 space-y-3 sm:space-y-0">
                <div className="text-sm text-gray-300 space-y-1">
                    <p>Current Target: <span className="font-semibold text-blue-400">{formatCurrency(profitTarget)}</span></p>
                    <p className="flex items-center">Current Suggested Risk: <span className="font-semibold text-blue-400 ml-1.5">{formatPercentagePrecise(currentSuggestedRisk)}</span>
                        <Tooltip delayDuration={100}>
                            <TooltipTrigger asChild><Info className="h-3 w-3 ml-1.5 text-gray-500 cursor-help" /></TooltipTrigger>
                            <TooltipContent className="bg-gray-800 text-gray-200 border-gray-600 rounded shadow-lg"><p>Calculated risk % needed on the next winning trade (using default multiplier) from your current balance to reach the target.</p></TooltipContent>
                        </Tooltip>
                    </p>
                </div>
                {trades.length > 0 && (
                 <Button variant="outline" size="sm" onClick={handleClearTrades} className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-md">
                   <Trash2 className="mr-2 h-4 w-4" /> Clear All Trades
                 </Button>
               )}
           </CardFooter>
        </Card>
      </motion.div>

       <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4, duration: 0.5 }}>
         <Card className="shadow-lg bg-gray-900 border border-gray-700 overflow-hidden rounded-lg">
            <CardHeader>
                 <div className="flex items-center space-x-3">
                    <TrendingUp className="h-6 w-6 text-blue-400" />
                    <CardTitle className="text-xl text-gray-100">Trade Log</CardTitle>
                 </div>
                <CardDescription className="text-gray-400 pt-1">Log your trades and track progress towards your target.</CardDescription>
            </CardHeader>
           <CardContent className="p-0">
            <div className="overflow-x-auto">
            <Table className="min-w-full">
                <TableCaption className="py-8 text-gray-500">{!trades.length ? 'No trades logged yet. Click "Add New Trade" below to start.' : 'End of trade log.'}</TableCaption>
              <TableHeader className="bg-gray-800/60 sticky top-0 z-10">
                <TableRow className="border-b border-gray-700 hover:bg-gray-800/80">
                  <TableHead className="w-[70px] px-3 py-3 text-center font-semibold text-gray-300">Trade #</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-gray-300 min-w-[150px]">Account Size</TableHead>
                  <TableHead className="w-[110px] px-4 py-3 font-semibold text-gray-300">Risk %</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-gray-300 min-w-[130px]">Risk $</TableHead>
                  <TableHead className="w-[160px] px-4 py-3 font-semibold text-gray-300">Outcome</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-gray-300 min-w-[150px]">Floating P/L</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-gray-300 min-w-[160px]">Account Balance</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-gray-300 min-w-[150px]">Profit Target</TableHead>
                  <TableHead className="w-[130px] px-4 py-3 font-semibold text-gray-300">Win Multiplier</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-gray-300 min-w-[160px]">Distance to Target</TableHead>
                  <TableHead className="w-[160px] px-4 py-3 font-semibold text-gray-300 text-right">
                      <div className="flex items-center justify-end">
                        Required Suggested Risk
                        <Tooltip delayDuration={100}>
                            <TooltipTrigger asChild><HelpCircle className="h-3.5 w-3.5 ml-1.5 text-gray-500 cursor-help flex-shrink-0" /></TooltipTrigger>
                            <TooltipContent side="top" className="bg-gray-800 text-gray-200 border-gray-600 rounded shadow-lg max-w-xs text-center">
                                <p>Suggested risk % for the *next* trade to reach the overall profit target, based on this row&apos;s outcome.</p>
                            </TooltipContent>
                        </Tooltip>
                       </div>
                  </TableHead>
                  <TableHead className="w-[70px] px-3 py-3 text-center font-semibold text-gray-300">Del</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-700">
                <AnimatePresence initial={false}>
                  {trades.map((trade, index) => (
                    <motion.tr
                      key={trade.id}
                      layout
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0, x: -100 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className={`border-gray-700 ${index % 2 === 0 ? 'bg-gray-900' : 'bg-gray-900/50'} hover:bg-gray-800/50`}
                    >
                      <TableCell className="px-3 py-2.5 text-center font-medium text-gray-400">{trade.tradeNumber}</TableCell>
                      <TableCell className="px-4 py-2.5 text-gray-300">{formatCurrency(trade.accountSize)}</TableCell>
                      <TableCell className="px-4 py-2.5">
                         <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={trade.riskPercentage.toString()}
                            onChange={(e) => handleUpdateTradeValue(trade.id, 'riskPercentage', e.target.value)}
                            className="h-8 text-sm w-[75px] p-1.5 bg-gray-700/80 border-gray-600 text-gray-100 focus:border-blue-500 focus:ring-blue-500 rounded shadow-sm"
                         />
                      </TableCell>
                      <TableCell className="px-4 py-2.5 text-gray-300">{formatCurrency(trade.riskAmount)}</TableCell>
                      <TableCell className="px-4 py-2.5">
                        <Select
                          value={trade.outcome}
                          onValueChange={(value: TradeOutcome) => handleUpdateTradeOutcome(trade.id, value)}
                        >
                          <SelectTrigger className={`h-8 text-sm w-[130px] border-gray-600 focus:border-blue-500 focus:ring-blue-500 bg-gray-700/80 text-gray-300 rounded shadow-sm ${
                              trade.outcome === 'win' ? 'text-green-400' :
                              trade.outcome === 'loss' ? 'text-red-400' :
                              trade.outcome === 'partial win' ? 'text-yellow-400' :
                              trade.outcome === 'breakeven' ? 'text-gray-400' :
                              'text-gray-500' // Pending
                          }`}>
                            <SelectValue placeholder="Outcome" />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 border-gray-600 text-gray-200 rounded shadow-lg">
                            <SelectItem value="pending" className="focus:bg-gray-700 focus:text-gray-100">Pending</SelectItem>
                            <SelectItem value="win" className="text-green-400 focus:bg-gray-700 focus:text-green-300">Win</SelectItem>
                            <SelectItem value="partial win" className="text-yellow-400 focus:bg-gray-700 focus:text-yellow-300">Partial Win</SelectItem>
                            <SelectItem value="loss" className="text-red-400 focus:bg-gray-700 focus:text-red-300">Loss</SelectItem>
                            <SelectItem value="breakeven" className="focus:bg-gray-700 focus:text-gray-100">Breakeven</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className={`px-4 py-2.5 font-medium ${trade.floatingPL > 0 ? 'text-green-400' : trade.floatingPL < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                        {formatCurrency(trade.floatingPL)}
                      </TableCell>
                      <TableCell className="px-4 py-2.5 font-semibold text-gray-200">{formatCurrency(trade.accountBalance)}</TableCell>
                      <TableCell className="px-4 py-2.5 text-gray-400">{formatCurrency(profitTarget)}</TableCell>
                      <TableCell className="px-4 py-2.5">
                         <Input
                            type="number"
                            step="0.1"
                            min="0"
                            value={trade.winMultiplier.toString()}
                            onChange={(e) => handleUpdateTradeValue(trade.id, 'winMultiplier', e.target.value)}
                            className="h-8 text-sm w-[70px] p-1.5 bg-gray-700/80 border-gray-600 text-gray-100 focus:border-blue-500 focus:ring-blue-500 rounded shadow-sm"
                         />
                      </TableCell>
                      <TableCell className={`px-4 py-2.5 font-medium ${trade.distanceToTarget <= 0 ? 'text-green-400' : 'text-orange-400'}`}>
                        {formatCurrency(trade.distanceToTarget)}
                      </TableCell>
                      <TableCell className="px-4 py-2.5 text-blue-300 text-right font-mono text-sm">
                          {formatPercentagePrecise(trade.nextSuggestedRisk)}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-center">
                        <Tooltip delayDuration={100}>
                             <TooltipTrigger asChild>
                                <Button
                                variant="ghost"
                                size="icon"
                                className="text-gray-500 hover:text-red-500 hover:bg-gray-700/50 h-8 w-8 rounded-full"
                                onClick={() => handleDeleteTrade(trade.id)}
                                >
                                <Trash2 className="h-4 w-4" />
                                </Button>
                             </TooltipTrigger>
                             <TooltipContent className="bg-gray-800 text-gray-200 border-gray-600 rounded shadow-lg"><p>Delete Trade</p></TooltipContent>
                        </Tooltip>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
               {trades.length > 0 && (
                 <TableFooter className="bg-gray-800/60">
                   <TableRow className="border-t border-gray-700 hover:bg-gray-800/80">
                     <TableCell colSpan={5} className="px-4 py-3 font-semibold text-right text-gray-300">Current Totals:</TableCell>
                     <TableCell className={`px-4 py-3 font-semibold ${totalPL >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(totalPL)}</TableCell>
                     <TableCell className="px-4 py-3 font-bold text-blue-400">{formatCurrency(currentBalance)}</TableCell>
                     <TableCell></TableCell>
                     <TableCell></TableCell>
                     <TableCell className={`px-4 py-3 font-semibold ${distanceToTargetFinal <= 0 ? 'text-green-400' : 'text-orange-400'}`}>{formatCurrency(distanceToTargetFinal)}</TableCell>
                     <TableCell></TableCell>
                     <TableCell></TableCell>
                   </TableRow>
                 </TableFooter>
               )}
            </Table>
            </div>
            </CardContent>
            <CardFooter className="p-4 border-t border-gray-700 bg-gray-900">
                 <Button onClick={handleAddTrade} className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium shadow-md hover:shadow-lg transition duration-150 ease-in-out rounded-md px-5 py-2.5">
                     <PlusCircle className="mr-2 h-5 w-5" /> Add New Trade
                 </Button>
            </CardFooter>
         </Card>
      </motion.div>

    </div>
    </TooltipProvider>
  );
};

export default TradingCalculator; 