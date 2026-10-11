import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  Wallet,
  Trophy,
  Zap,
  Flame,
  Swords,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
  PlusCircle,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  ChevronRight,
  TrendingUp,
  Award
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { sound } from '../services/audio';
import { User, GameConfig, GameStakeTier, GameId, DEFAULT_GAMES, DEFAULT_STAKES } from '../types';

interface GamesScreenProps {
  user: User;
  onBack: () => void;
  onNavigateToRecharge: () => void;
}

export const GamesScreen: React.FC<GamesScreenProps> = ({
  user,
  onBack,
  onNavigateToRecharge
}) => {
  // State
  const [games, setGames] = useState<GameConfig[]>(DEFAULT_GAMES);
  const [stakes, setStakes] = useState<GameStakeTier[]>(DEFAULT_STAKES);
  const [walletBalance, setWalletBalance] = useState<number>(() => (user as any).availableBalance || 0);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Selected game & stake for modal
  const [selectedGame, setSelectedGame] = useState<GameConfig | null>(null);
  const [selectedStake, setSelectedStake] = useState<GameStakeTier | null>(DEFAULT_STAKES[0]);
  const [useCustomStake, setUseCustomStake] = useState<boolean>(false);
  const [customStakeInput, setCustomStakeInput] = useState<string>('50');

  // Matchmaking & Gameplay state
  const [gameState, setGameState] = useState<'lobby' | 'matchmaking' | 'playing' | 'result'>('lobby');
  const [matchmakingCountdown, setMatchmakingCountdown] = useState<number>(3);
  const [activeSession, setActiveSession] = useState<any | null>(null);
  const [gameResult, setGameResult] = useState<'WON' | 'LOST' | null>(null);
  const [resultData, setResultData] = useState<any | null>(null);

  // Load game configs & balance
  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await api.getGamesConfig();
      if (res) {
        setGames(res.games || []);
        setStakes(res.stakes || []);
        setWalletBalance(res.availableBalance || 0);
        if (res.stakes && res.stakes.length > 0 && !selectedStake) {
          setSelectedStake(res.stakes[0]);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load games');
    } finally {
      setLoading(false);
    }
  }, [selectedStake]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Start game matchmaking
  const handleStartGame = async () => {
    if (!selectedGame) return;

    let targetFee = 0;
    if (useCustomStake) {
      const num = Number(customStakeInput);
      if (isNaN(num) || num < 0.50 || num > 20000) {
        sound.playError();
        setErrorMsg('Entry stake must be between ₹0.50 and ₹20,000.');
        return;
      }
      targetFee = num;
    } else {
      if (!selectedStake) return;
      targetFee = selectedStake.entryFee;
    }

    if (walletBalance < targetFee) {
      sound.playError();
      setErrorMsg(`Insufficient balance! Pehle wallet recharge karein (₹${targetFee} required).`);
      return;
    }

    try {
      sound.playTap();
      setGameState('matchmaking');
      setMatchmakingCountdown(3);

      const res = await api.startGame(
        selectedGame.id,
        useCustomStake ? undefined : selectedStake?.id,
        useCustomStake ? Number(customStakeInput) : undefined
      );
      setActiveSession(res);
      setWalletBalance(res.availableBalance);

      // Countdown 3, 2, 1 -> Play
      let count = 3;
      const timer = setInterval(() => {
        count--;
        setMatchmakingCountdown(count);
        if (count <= 0) {
          clearInterval(timer);
          setGameState('playing');
        }
      }, 900);
    } catch (err: any) {
      sound.playError();
      setErrorMsg(err.message || 'Game could not be started');
      setGameState('lobby');
    }
  };

  // Handle Game End
  const handleFinishGame = async (playerScore: number, botScore: number) => {
    if (!activeSession) return;
    try {
      const res = await api.finishGame(activeSession.sessionId, playerScore, botScore);
      setResultData(res);
      setGameResult(res.result);
      setWalletBalance(res.availableBalance);
      setGameState('result');

      if (res.result === 'WON') {
        sound.playGameWin();
        try {
          confetti({
            particleCount: 70,
            spread: 80,
            origin: { y: 0.6 }
          });
        } catch {}
      } else {
        sound.playGameLose();
      }
    } catch (err: any) {
      setGameState('lobby');
      setErrorMsg(err.message || 'Failed to submit game result');
    }
  };

  // Reset to Lobby
  const handleReturnToLobby = () => {
    sound.playTap();
    setGameState('lobby');
    setSelectedGame(null);
    setActiveSession(null);
    setGameResult(null);
    setResultData(null);
    loadConfig();
  };

  return (
    <div className="flex-1 w-full min-h-full flex flex-col bg-[#07090e] text-white select-none">
      {/* ================= TOP HEADER ================= */}
      <div className="px-4 py-3 bg-[#0a0e17] border-b border-slate-800/80 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => {
              sound.playTap();
              if (gameState !== 'lobby') {
                handleReturnToLobby();
              } else {
                onBack();
              }
            }}
            className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white active:scale-95 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center space-x-1.5">
              <h2 className="text-sm font-extrabold tracking-tight text-white">1v1 ARENA</h2>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold font-mono">
                LIVE
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Real Player vs Bot Battles</p>
          </div>
        </div>

        {/* Live Wallet Chip */}
        <div className="flex items-center space-x-2">
          <div className="bg-slate-950/90 border border-emerald-500/30 rounded-xl px-2.5 py-1 flex items-center space-x-1.5 shadow-sm">
            <Wallet className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-mono text-xs font-bold text-emerald-300">
              ₹{walletBalance.toFixed(2)}
            </span>
          </div>
          <button
            onClick={() => {
              sound.playTap();
              onNavigateToRecharge();
            }}
            className="w-7 h-7 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-emerald-500/20 active:scale-95 transition-transform"
            title="Add Cash"
          >
            <PlusCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Error Toast */}
      {errorMsg && (
        <div className="m-3 p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-xs text-slate-400 hover:text-white ml-2">
            ✕
          </button>
        </div>
      )}

      {/* ================= 1. LOBBY VIEW ================= */}
      {gameState === 'lobby' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
          {/* Hero Banner */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-900 border border-purple-500/30 p-4 shadow-xl">
            <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between relative z-10">
              <div className="space-y-1">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30 uppercase tracking-wider font-mono">
                  91% Win Rate Bot Arena
                </span>
                <h3 className="text-base font-black text-white mt-1">
                  Khele aur Jeetein Real Cash 💰
                </h3>
                <p className="text-[11px] text-purple-200">
                  50 paise lagayein to ₹0.80 payein, ₹200 par ₹260!
                </p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-400 to-purple-500 p-[1.5px] shrink-0 shadow-lg shadow-purple-500/30">
                <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                  <Swords className="w-7 h-7 text-amber-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stake Preview Chips */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
              Popular Entry Stakes
            </span>
            <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-none">
              {(stakes || []).map((s) => (
                <div
                  key={s.id}
                  className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 shrink-0 text-center"
                >
                  <span className="text-[10px] text-slate-400 block">Entry ₹{s.entryFee}</span>
                  <span className="text-xs font-mono font-black text-emerald-400">Win ₹{s.payout}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 5 Games Grid */}
          <div className="space-y-2.5">
            <span className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center space-x-1.5">
              <Flame className="w-4 h-4 text-rose-500" />
              <span>Available 1v1 Games (5)</span>
            </span>

            <div className="grid grid-cols-1 gap-3">
              {games.map((g) => {
                const isEnabled = g.enabled;
                const is2Player = g.playerMode === '2_PLAYER' || g.id === 'ludo' || g.id === 'carrom';
                return (
                  <div
                    key={g.id}
                    onClick={() => {
                      if (!isEnabled) return;
                      sound.playTap();
                      setSelectedGame(g);
                      if (!selectedStake && stakes.length > 0) {
                        setSelectedStake(stakes[0]);
                      }
                    }}
                    className={`relative overflow-hidden rounded-2xl border p-4 transition-all ${
                      isEnabled
                        ? 'bg-gradient-to-r from-slate-900 via-slate-900/95 to-[#0e1424] border-slate-800 hover:border-cyan-500/50 shadow-lg cursor-pointer active:scale-[0.98]'
                        : 'bg-slate-950/60 border-slate-900 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3.5">
                        <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-cyan-500/20 via-slate-800 to-purple-500/20 border border-slate-700/60 flex items-center justify-center text-3xl shrink-0 shadow-inner">
                          {g.icon}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                            <h4 className="text-sm font-black text-white">{g.name}</h4>
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold border ${
                              is2Player 
                                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' 
                                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            }`}>
                              {is2Player ? '👥 2 PLAYER (vs BOT)' : '👤 SINGLE PLAYER'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                            {g.description}
                          </p>
                          <div className="flex items-center space-x-2 mt-1.5 text-[10px] text-slate-500">
                            <span className="flex items-center space-x-1 text-emerald-400 font-medium">
                              <Zap className="w-3 h-3" />
                              <span>1.6x Instant Cash</span>
                            </span>
                            <span>•</span>
                            <span className="text-slate-400">
                              {is2Player ? '🤖 Auto Bot Opponent' : '⚡ Solo Score Challenge'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {isEnabled ? (
                          <button
                            type="button"
                            className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs shadow-md shadow-emerald-500/20"
                          >
                            PLAY
                          </button>
                        ) : (
                          <span className="text-[10px] px-2 py-1 rounded bg-slate-800 text-slate-500 font-bold">
                            CLOSED
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Fair Play Notice */}
          <div className="rounded-xl bg-slate-950/80 border border-slate-800/80 p-3 text-[11px] text-slate-400 flex items-start space-x-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p>
              2-Player games me 1 Real Player vs 1 Bot match hota hai (Bot auto chalta hai). Jeetne par winning reward (1.6x) instant wallet me credit hota hai. Agar aap haar jate hain toh entry fee deduct hoti hai.
            </p>
          </div>
        </div>
      )}

      {/* ================= STAKE SELECTION MODAL ================= */}
      {selectedGame && gameState === 'lobby' && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-3 animate-in fade-in duration-200">
          <div className="bg-gradient-to-b from-[#111726] via-[#0d121e] to-[#070a12] border-2 border-cyan-500/30 rounded-3xl w-full max-w-sm p-5 shadow-2xl shadow-cyan-500/20 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <span className="text-2xl">{selectedGame.icon}</span>
                <div>
                  <h3 className="text-sm font-black text-white">{selectedGame.name}</h3>
                  <span className="text-[10px] text-slate-400">
                    {(selectedGame.playerMode === '2_PLAYER' || selectedGame.id === 'ludo' || selectedGame.id === 'carrom') 
                      ? '👥 2-Player (1v1 vs Bot)' 
                      : '👤 Single Player'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedGame(null)}
                className="w-7 h-7 rounded-full bg-slate-800/80 text-slate-400 hover:text-white flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            {/* Stake Mode Switcher: Preset vs Custom */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  setUseCustomStake(false);
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  !useCustomStake
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Preset Stakes
              </button>
              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  setUseCustomStake(true);
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  useCustomStake
                    ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Custom (₹0.50 - ₹20k)
              </button>
            </div>

            {/* Stakes Selection Area */}
            {!useCustomStake ? (
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-2">
                  Choose Battle Stake & Winning Prize:
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {stakes.map((s) => {
                    const isSelected = selectedStake?.id === s.id;
                    const isAffordable = walletBalance >= s.entryFee;
                    return (
                      <div
                        key={s.id}
                        onClick={() => {
                          sound.playTap();
                          setSelectedStake(s);
                        }}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer relative ${
                          isSelected
                            ? 'bg-cyan-500/20 border-cyan-400 shadow-md shadow-cyan-500/20'
                            : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[9px] text-slate-400 uppercase font-semibold block">Entry Fee</span>
                            <span className="text-sm font-black font-mono text-white">
                              ₹{s.entryFee < 1 ? s.entryFee.toFixed(2) : s.entryFee.toLocaleString('en-IN')}
                            </span>
                          </div>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                            Win ₹{s.payout < 1 ? s.payout.toFixed(2) : s.payout.toLocaleString('en-IN')}
                          </span>
                        </div>
                        {!isAffordable && (
                          <span className="text-[8px] text-rose-400 font-medium mt-1 block">Low balance</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Custom Amount Input View (₹0.50 to ₹20,000) */
              <div className="space-y-3">
                <label className="text-[10px] uppercase font-bold text-slate-400 block">
                  Enter Custom Bet Stake (₹0.50 se ₹20,000 tak):
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 font-bold text-amber-400 text-base">₹</span>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="20000"
                    value={customStakeInput}
                    onChange={(e) => setCustomStakeInput(e.target.value)}
                    placeholder="Enter amount (0.50 to 20000)"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 pl-8 pr-3 text-white font-mono font-bold text-base focus:border-amber-400 focus:outline-none"
                  />
                </div>

                {/* Quick chip buttons */}
                <div className="flex flex-wrap gap-1.5">
                  {[0.5, 1, 10, 50, 100, 500, 1000, 5000, 10000, 20000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        sound.playTap();
                        setCustomStakeInput(String(amt));
                      }}
                      className={`py-1 px-2 rounded-lg text-[10px] font-mono font-bold border ${
                        Number(customStakeInput) === amt
                          ? 'bg-amber-400 text-slate-950 border-amber-400'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                      }`}
                    >
                      ₹{amt < 1 ? amt.toFixed(2) : amt.toLocaleString('en-IN')}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Selected Summary Card */}
            {(() => {
              const currentFee = useCustomStake ? Number(customStakeInput) || 0 : selectedStake?.entryFee || 0;
              const currentPayout = useCustomStake ? Math.round(currentFee * 1.6 * 100) / 100 : selectedStake?.payout || 0;
              return (
                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between text-xs font-mono">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Entry Deducted:</span>
                    <span className="text-rose-400 font-bold">
                      ₹{currentFee < 1 ? currentFee.toFixed(2) : currentFee.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 text-[10px] block">You Win (1.6x):</span>
                    <span className="text-emerald-400 font-bold text-sm">
                      ₹{currentPayout < 1 ? currentPayout.toFixed(2) : currentPayout.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Action Buttons */}
            {(() => {
              const currentFee = useCustomStake ? Number(customStakeInput) || 0 : selectedStake?.entryFee || 0;
              const isAffordable = walletBalance >= currentFee;

              return (
                <div className="space-y-2 pt-1">
                  {!isAffordable ? (
                    <button
                      type="button"
                      onClick={() => {
                        sound.playTap();
                        setSelectedGame(null);
                        onNavigateToRecharge();
                      }}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 font-black text-xs shadow-lg active:scale-95 transition-all flex items-center justify-center space-x-1.5"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>Wallet Recharge Karein (Balance Low)</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStartGame}
                      className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/25 active:scale-95 transition-all flex items-center justify-center space-x-2"
                    >
                      <Swords className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                      <span>
                        Play Game (₹{currentFee < 1 ? currentFee.toFixed(2) : currentFee.toLocaleString('en-IN')})
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setSelectedGame(null)}
                    className="w-full py-1 text-center text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ================= 2. MATCHMAKING SCREEN ================= */}
      {gameState === 'matchmaking' && activeSession && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6">
          <div className="relative">
            {/* Radar Pulsing rings */}
            <div className="w-32 h-32 rounded-full border border-cyan-500/40 animate-ping absolute inset-0 m-auto" />
            <div className="w-24 h-24 rounded-full border-2 border-emerald-500/60 animate-pulse absolute inset-0 m-auto" />
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-cyan-500 to-emerald-500 p-[2px] relative z-10 shadow-2xl shadow-cyan-500/40">
              <div className="w-full h-full bg-[#0a0f1d] rounded-[14px] flex items-center justify-center text-3xl">
                {activeSession.game?.icon || '🎮'}
              </div>
            </div>
          </div>

          <div>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-bold uppercase tracking-wider border border-cyan-500/30">
              Matchmaking Active
            </span>
            <h3 className="text-lg font-black text-white mt-2">Finding Opponent...</h3>
            <p className="text-xs text-slate-400 mt-1">Connecting to live game room</p>
          </div>

          {/* Versus Display */}
          <div className="w-full max-w-xs bg-slate-900/90 rounded-2xl border border-slate-800 p-4 flex items-center justify-between">
            {/* Player */}
            <div className="flex flex-col items-center space-y-1">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-lg font-black text-emerald-300">
                {user.name[0]}
              </div>
              <span className="text-xs font-bold text-white max-w-[80px] truncate">{user.name.split(' ')[0]}</span>
              <span className="text-[9px] text-emerald-400 font-mono font-bold">YOU</span>
            </div>

            <div className="flex flex-col items-center">
              <span className="text-lg font-black text-rose-500 font-mono">VS</span>
              <span className="text-xs font-mono font-bold text-amber-400 mt-1">
                {matchmakingCountdown > 0 ? `${matchmakingCountdown}s` : 'START!'}
              </span>
            </div>

            {/* Bot Opponent */}
            <div className="flex flex-col items-center space-y-1">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 border-2 border-rose-400 flex items-center justify-center text-lg font-black text-rose-300">
                🤖
              </div>
              <span className="text-xs font-bold text-white max-w-[80px] truncate">{activeSession.bot?.name || 'Bot_Pro'}</span>
              <span className="text-[9px] text-rose-400 font-mono font-bold">OPPONENT</span>
            </div>
          </div>

          <div className="text-xs font-mono text-slate-400">
            Prize Pool: <span className="font-bold text-emerald-400">₹{activeSession.payout}</span>
          </div>
        </div>
      )}

      {/* ================= 3. ACTIVE GAME PLAY ================= */}
      {gameState === 'playing' && activeSession && (
        <GamePlayContainer
          session={activeSession}
          onFinishGame={handleFinishGame}
        />
      )}

      {/* ================= 4. POST-GAME RESULT SCREEN ================= */}
      {gameState === 'result' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-5 animate-in zoom-in-95 duration-200">
          {gameResult === 'WON' ? (
            <>
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-amber-400 via-emerald-400 to-teal-400 p-[2px] shadow-2xl shadow-emerald-500/40 animate-bounce">
                <div className="w-full h-full bg-[#0a121f] rounded-[22px] flex items-center justify-center text-4xl">
                  🏆
                </div>
              </div>
              <div>
                <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-black font-mono tracking-wider border border-emerald-500/40 uppercase">
                  VICTORY WINNER!
                </span>
                <h2 className="text-2xl font-black text-white mt-2">
                  Aap Jeet Gaye! 🎉
                </h2>
                <div className="text-3xl font-black font-mono text-emerald-400 mt-2">
                  +₹{resultData?.payout?.toFixed(2) || '0.00'}
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Prize aapke available wallet balance me instant credit ho gaya hai!
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-rose-500 via-orange-500 to-slate-800 p-[2px] shadow-2xl shadow-rose-500/30">
                <div className="w-full h-full bg-[#0d1017] rounded-[22px] flex items-center justify-center text-4xl">
                  💔
                </div>
              </div>
              <div>
                <span className="text-xs px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 font-black font-mono tracking-wider border border-rose-500/40 uppercase">
                  ROUND LOST
                </span>
                <h2 className="text-2xl font-black text-white mt-2">
                  Bot Jeet Gaya!
                </h2>
                <div className="text-2xl font-black font-mono text-rose-400 mt-2">
                  -₹{resultData?.entryFee?.toFixed(2) || '0.00'}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Opponent {resultData?.botName || 'Bot'} ne higher score banaya. Agle round me revenge lijiye!
                </p>
              </div>
            </>
          )}

          {/* Stats Box */}
          <div className="w-full max-w-xs bg-slate-900/90 rounded-2xl border border-slate-800 p-4 font-mono text-xs space-y-2">
            <div className="flex justify-between text-slate-400">
              <span>Game:</span>
              <span className="text-white font-bold">{activeSession?.game?.name}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Entry Fee:</span>
              <span className="text-white">₹{activeSession?.entryFee}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>New Balance:</span>
              <span className="text-emerald-400 font-bold">₹{walletBalance.toFixed(2)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="w-full max-w-xs space-y-2 pt-2">
            <button
              onClick={handleStartGame}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 text-slate-950 font-black text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center space-x-1.5"
            >
              <RotateCcw className="w-4 h-4 stroke-[2.5]" />
              <span>Phir Se Khele (₹{activeSession?.entryFee})</span>
            </button>

            <button
              onClick={handleReturnToLobby}
              className="w-full py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-bold text-xs hover:text-white"
            >
              Back to Game Lobby
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ========================================================================= */
/* SUB-CONTAINER FOR THE 5 PLAYABLE MINI-GAMES                               */
/* ========================================================================= */

interface GamePlayContainerProps {
  session: any;
  onFinishGame: (playerScore: number, botScore: number) => void;
}

const GamePlayContainer: React.FC<GamePlayContainerProps> = ({ session, onFinishGame }) => {
  const gameId = session.game?.id as GameId;

  return (
    <div className="flex-1 flex flex-col p-4 overflow-y-auto">
      {gameId === 'ludo' && <LudoGame session={session} onFinish={onFinishGame} />}
      {gameId === 'carrom' && <CarromGame session={session} onFinish={onFinishGame} />}
      {gameId === 'fruit_ninja' && <FruitNinjaGame session={session} onFinish={onFinishGame} />}
      {gameId === 'knife_hit' && <KnifeHitGame session={session} onFinish={onFinishGame} />}
      {gameId === 'candy_match' && <CandyMatchGame session={session} onFinish={onFinishGame} />}
    </div>
  );
};

/* ========================================================================= */
/* 1. LUDO EXPRESS (1v1 Dice Clash)                                          */
/* ========================================================================= */
const LudoGame: React.FC<{ session: any; onFinish: (p: number, b: number) => void }> = ({ session, onFinish }) => {
  const targetResult = session.targetResult; // 'WON' or 'LOST'
  const [playerPos, setPlayerPos] = useState<number>(0);
  const [botPos, setBotPos] = useState<number>(0);
  const [currentDice, setCurrentDice] = useState<number>(6);
  const [turn, setTurn] = useState<'player' | 'bot'>('player');
  const [rolling, setRolling] = useState<boolean>(false);
  const [gameLog, setGameLog] = useState<string>('Aapka turn hai! Roll karein.');

  const WIN_STEPS = 12;

  const rollPlayerDice = () => {
    if (turn !== 'player' || rolling) return;
    setRolling(true);
    sound.playDice();

    setTimeout(() => {
      // If targetResult is WON, player gets better rolls (4, 5, 6)
      const roll = targetResult === 'WON' 
        ? Math.floor(Math.random() * 3) + 4 
        : Math.floor(Math.random() * 5) + 1;

      setCurrentDice(roll);
      setRolling(false);

      const nextPos = Math.min(WIN_STEPS, playerPos + roll);
      setPlayerPos(nextPos);
      setGameLog(`Aapne ${roll} roll kiya!`);

      if (nextPos >= WIN_STEPS) {
        setTimeout(() => onFinish(100, botPos * 7), 600);
        return;
      }

      // Switch to Bot
      setTurn('bot');
      setTimeout(() => botTurn(nextPos), 900);
    }, 450);
  };

  const botTurn = (currentPlayerPos: number) => {
    setRolling(true);
    sound.playDice();

    setTimeout(() => {
      // If targetResult is LOST, Bot gets high rolls (5, 6)
      const botRoll = targetResult === 'LOST'
        ? Math.floor(Math.random() * 2) + 5
        : Math.floor(Math.random() * 3) + 1;

      setCurrentDice(botRoll);
      setRolling(false);

      setBotPos((prev) => {
        const nextBotPos = Math.min(WIN_STEPS, prev + botRoll);
        setGameLog(`Bot ne ${botRoll} roll kiya!`);

        if (nextBotPos >= WIN_STEPS) {
          setTimeout(() => onFinish(currentPlayerPos * 7, 100), 600);
          return nextBotPos;
        }

        setTurn('player');
        return nextBotPos;
      });
    }, 600);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-between py-2 text-center select-none space-y-4">
      {/* Turn Banner */}
      <div className="w-full bg-slate-900 rounded-2xl border border-slate-800 p-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center">
            🎲
          </div>
          <div className="text-left">
            <span className="text-xs font-black text-white">Ludo Express</span>
            <span className="text-[10px] text-slate-400 block">{gameLog}</span>
          </div>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
          turn === 'player' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
        }`}>
          {turn === 'player' ? 'YOUR TURN' : 'BOT TURN'}
        </span>
      </div>

      {/* Ludo Track */}
      <div className="w-full max-w-xs bg-[#0b0e17] rounded-3xl border-2 border-slate-800 p-4 space-y-4 shadow-xl">
        {/* Track Line */}
        <div className="space-y-3">
          {/* Player Progress */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-cyan-400 font-bold">You (Blue Token)</span>
              <span className="font-mono text-cyan-300">{playerPos} / {WIN_STEPS} Steps</span>
            </div>
            <div className="w-full h-4 bg-slate-950 rounded-full border border-slate-800 overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300 rounded-full"
                style={{ width: `${(playerPos / WIN_STEPS) * 100}%` }}
              />
            </div>
          </div>

          {/* Bot Progress */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-rose-400 font-bold">{session.bot?.name || 'Bot'} (Red Token)</span>
              <span className="font-mono text-rose-300">{botPos} / {WIN_STEPS} Steps</span>
            </div>
            <div className="w-full h-4 bg-slate-950 rounded-full border border-slate-800 overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-rose-500 to-amber-500 transition-all duration-300 rounded-full"
                style={{ width: `${(botPos / WIN_STEPS) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* 3D Dice Display */}
        <div className="py-4 flex flex-col items-center justify-center">
          <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 border-2 border-cyan-400/40 flex items-center justify-center shadow-2xl shadow-cyan-500/20 text-4xl font-black font-mono text-cyan-300 ${
            rolling ? 'animate-spin' : ''
          }`}>
            {currentDice}
          </div>
          <span className="text-[10px] text-slate-400 mt-2 font-mono uppercase">
            {rolling ? 'Rolling Dice...' : `Last Roll: ${currentDice}`}
          </span>
        </div>
      </div>

      {/* Roll Action Button */}
      <button
        onClick={rollPlayerDice}
        disabled={turn !== 'player' || rolling}
        className="w-full max-w-xs py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black text-sm shadow-xl active:scale-95 transition-all disabled:opacity-40"
      >
        {turn === 'player' ? '🎲 ROLL DICE' : 'Waiting for Bot...'}
      </button>
    </div>
  );
};

/* ========================================================================= */
/* 2. CARROM CLASH (Striker Physics)                                         */
/* ========================================================================= */
const CarromGame: React.FC<{ session: any; onFinish: (p: number, b: number) => void }> = ({ session, onFinish }) => {
  const targetResult = session.targetResult;
  const [playerScore, setPlayerScore] = useState<number>(0);
  const [botScore, setBotScore] = useState<number>(0);
  const [strikerX, setStrikerX] = useState<number>(50); // percentage 20 to 80
  const [shotsLeft, setShotsLeft] = useState<number>(5);
  const [isStriking, setIsStriking] = useState<boolean>(false);
  const [boardLog, setBoardLog] = useState<string>('Aim striker & click Strike!');

  const handleStrike = () => {
    if (isStriking || shotsLeft <= 0) return;
    setIsStriking(true);
    sound.playHit();

    // Determine shot success
    setTimeout(() => {
      // If WON: Player pockets Queen / White coin (+20 or +10)
      const pointsScored = targetResult === 'WON' 
        ? (Math.random() > 0.3 ? 20 : 10)
        : (Math.random() > 0.7 ? 10 : 0);

      const nextPlayerScore = playerScore + pointsScored;
      setPlayerScore(nextPlayerScore);

      if (pointsScored > 0) {
        sound.playRewardChime();
        setBoardLog(`Pocketed coin! +${pointsScored} pts!`);
      } else {
        setBoardLog(`Missed pocket! Bot's shot coming.`);
      }

      // Bot shot
      setTimeout(() => {
        sound.playHit();
        const botPoints = targetResult === 'LOST' ? 20 : (Math.random() > 0.5 ? 10 : 0);
        const nextBotScore = botScore + botPoints;
        setBotScore(nextBotScore);
        setIsStriking(false);

        const nextShots = shotsLeft - 1;
        setShotsLeft(nextShots);

        if (nextShots <= 0) {
          setTimeout(() => {
            onFinish(nextPlayerScore, nextBotScore);
          }, 600);
        }
      }, 700);
    }, 400);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-between text-center select-none space-y-3">
      {/* Score Header */}
      <div className="w-full bg-slate-900 rounded-2xl border border-slate-800 p-3 flex justify-between items-center text-xs">
        <div>
          <span className="text-cyan-400 font-bold block">You</span>
          <span className="text-lg font-black font-mono text-white">{playerScore} pts</span>
        </div>
        <div className="text-center font-mono text-slate-400">
          <span className="text-[10px] block uppercase">Shots Left</span>
          <span className="text-sm font-bold text-amber-400">{shotsLeft}</span>
        </div>
        <div className="text-right">
          <span className="text-rose-400 font-bold block">{session.bot?.name || 'Bot'}</span>
          <span className="text-lg font-black font-mono text-white">{botScore} pts</span>
        </div>
      </div>

      {/* Carrom Board Canvas/Visual */}
      <div className="relative w-72 h-72 rounded-3xl bg-[#d4a373] border-8 border-[#6b4226] shadow-2xl flex items-center justify-center overflow-hidden">
        {/* 4 Pockets */}
        <div className="absolute top-1 left-1 w-8 h-8 rounded-full bg-slate-950 border border-slate-800" />
        <div className="absolute top-1 right-1 w-8 h-8 rounded-full bg-slate-950 border border-slate-800" />
        <div className="absolute bottom-1 left-1 w-8 h-8 rounded-full bg-slate-950 border border-slate-800" />
        <div className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-slate-950 border border-slate-800" />

        {/* Center circle */}
        <div className="w-24 h-24 rounded-full border-2 border-red-800/60 flex items-center justify-center">
          <div className="w-6 h-6 rounded-full bg-red-600 shadow-md animate-pulse" />
        </div>

        {/* Floating coins */}
        <div className="absolute top-24 left-28 w-5 h-5 rounded-full bg-white shadow-md border border-slate-400" />
        <div className="absolute top-36 left-32 w-5 h-5 rounded-full bg-slate-900 shadow-md border border-slate-700" />

        {/* Baseline & Striker */}
        <div className="absolute bottom-8 w-48 h-1 bg-red-800/60" />
        <div
          className="absolute bottom-6 w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-400 to-yellow-300 border-2 border-white shadow-xl transition-all"
          style={{ left: `${strikerX}%`, transform: 'translateX(-50%)' }}
        />
      </div>

      <p className="text-[11px] text-slate-400 font-mono">{boardLog}</p>

      {/* Striker Position Slider */}
      <div className="w-full max-w-xs space-y-1">
        <label className="text-[10px] text-slate-400 uppercase font-semibold">Adjust Striker Baseline Position</label>
        <input
          type="range"
          min="20"
          max="80"
          value={strikerX}
          disabled={isStriking || shotsLeft <= 0}
          onChange={(e) => setStrikerX(Number(e.target.value))}
          className="w-full accent-cyan-400 bg-slate-800 h-2 rounded-lg"
        />
      </div>

      {/* Strike Button */}
      <button
        onClick={handleStrike}
        disabled={isStriking || shotsLeft <= 0}
        className="w-full max-w-xs py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black text-sm shadow-xl active:scale-95 transition-all disabled:opacity-40"
      >
        {isStriking ? 'Striking...' : '🎯 STRIKE CARROM'}
      </button>
    </div>
  );
};

/* ========================================================================= */
/* 3. FRUIT NINJA (Fruit Slash)                                              */
/* ========================================================================= */
const FruitNinjaGame: React.FC<{ session: any; onFinish: (p: number, b: number) => void }> = ({ session, onFinish }) => {
  const targetResult = session.targetResult;
  const [score, setScore] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(20);
  const [fruits, setFruits] = useState<Array<{ id: number; icon: string; x: number; y: number; sliced: boolean }>>([]);

  const FRUITS_LIST = ['🍉', '🍎', '🍊', '🍍', '🍓', '🍇'];

  // Game loop: spawn fruits
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timer);
          // End game
          const botFinalScore = targetResult === 'LOST' ? 380 : 120;
          setTimeout(() => onFinish(score, botFinalScore), 300);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    const fruitSpawner = setInterval(() => {
      const newFruit = {
        id: Date.now() + Math.random(),
        icon: FRUITS_LIST[Math.floor(Math.random() * FRUITS_LIST.length)],
        x: Math.floor(Math.random() * 75) + 10,
        y: Math.floor(Math.random() * 70) + 15,
        sliced: false
      };
      setFruits((prev) => [...prev.slice(-6), newFruit]);
    }, 600);

    return () => {
      clearInterval(timer);
      clearInterval(fruitSpawner);
    };
  }, [score, targetResult, onFinish]);

  const sliceFruit = (id: number) => {
    sound.playSlice();
    setFruits((prev) =>
      prev.map((f) => {
        if (f.id === id && !f.sliced) {
          setScore((s) => s + 20);
          return { ...f, sliced: true };
        }
        return f;
      })
    );
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-between text-center select-none space-y-3">
      {/* Top Header */}
      <div className="w-full bg-slate-900 rounded-2xl border border-slate-800 p-3 flex justify-between items-center text-xs font-mono">
        <div>
          <span className="text-slate-400 block text-[10px]">YOUR SCORE</span>
          <span className="text-xl font-black text-emerald-400">{score}</span>
        </div>
        <div className="text-center">
          <span className="text-slate-400 block text-[10px]">TIME LEFT</span>
          <span className="text-lg font-black text-amber-400">{timeLeft}s</span>
        </div>
        <div className="text-right">
          <span className="text-slate-400 block text-[10px]">BOT SCORE</span>
          <span className="text-lg font-black text-rose-400">
            {targetResult === 'LOST' ? Math.floor(score * 1.6 + 80) : Math.floor(score * 0.6)}
          </span>
        </div>
      </div>

      {/* Slicing Arena */}
      <div className="w-full h-80 rounded-3xl bg-[#090e18] border-2 border-slate-800 relative overflow-hidden shadow-2xl">
        <div className="absolute top-2 left-3 text-[10px] text-slate-500 font-mono uppercase">
          Tap or Swipe to slice fruits!
        </div>

        {fruits.map((f) => (
          <div
            key={f.id}
            onPointerDown={() => sliceFruit(f.id)}
            className={`absolute cursor-pointer transition-transform duration-200 ${
              f.sliced ? 'scale-125 opacity-20 rotate-45' : 'hover:scale-110 active:scale-95'
            }`}
            style={{ left: `${f.x}%`, top: `${f.y}%` }}
          >
            <span className="text-4xl filter drop-shadow-lg select-none">{f.icon}</span>
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-400">
        Jitne zyaada fruits slice karenge, utna high score banega!
      </p>
    </div>
  );
};

/* ========================================================================= */
/* 4. KNIFE HIT MASTER                                                       */
/* ========================================================================= */
const KnifeHitGame: React.FC<{ session: any; onFinish: (p: number, b: number) => void }> = ({ session, onFinish }) => {
  const targetResult = session.targetResult;
  const [knivesInLog, setKnivesInLog] = useState<number[]>([0, 120]);
  const [knivesLeft, setKnivesLeft] = useState<number>(6);
  const [score, setScore] = useState<number>(0);
  const [isThrowing, setIsThrowing] = useState<boolean>(false);
  const [logRotation, setLogRotation] = useState<number>(0);

  // Rotation effect
  useEffect(() => {
    const interval = setInterval(() => {
      setLogRotation((r) => (r + 4) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const throwKnife = () => {
    if (isThrowing || knivesLeft <= 0) return;
    setIsThrowing(true);
    sound.playHit();

    setTimeout(() => {
      const currentAngle = (360 - logRotation) % 360;

      // Check collision with existing knives
      const hasHitOtherKnife = knivesInLog.some(
        (angle) => Math.abs(angle - currentAngle) < 22 || Math.abs(angle - currentAngle) > 338
      );

      // If targetResult is LOST, force a collision after 2-3 knives
      const forceDefeat = targetResult === 'LOST' && knivesLeft <= 3;

      if (hasHitOtherKnife || forceDefeat) {
        sound.playGameLose();
        setIsThrowing(false);
        setTimeout(() => onFinish(score, 180), 500);
        return;
      }

      // Success
      setKnivesInLog((prev) => [...prev, currentAngle]);
      const nextScore = score + 25;
      setScore(nextScore);
      const nextKnives = knivesLeft - 1;
      setKnivesLeft(nextKnives);
      setIsThrowing(false);

      if (nextKnives <= 0) {
        setTimeout(() => onFinish(nextScore, 70), 500);
      }
    }, 200);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-between text-center select-none space-y-3">
      {/* Header */}
      <div className="w-full bg-slate-900 rounded-2xl border border-slate-800 p-3 flex justify-between items-center text-xs font-mono">
        <div>
          <span className="text-slate-400 block text-[10px]">KNIFE SCORE</span>
          <span className="text-lg font-black text-cyan-400">{score}</span>
        </div>
        <div className="text-center">
          <span className="text-slate-400 block text-[10px]">KNIVES LEFT</span>
          <span className="text-lg font-black text-amber-400">{knivesLeft}</span>
        </div>
        <div className="text-right">
          <span className="text-slate-400 block text-[10px]">OPPONENT</span>
          <span className="text-sm font-bold text-rose-400">{session.bot?.name || 'Bot'}</span>
        </div>
      </div>

      {/* Rotating Log Target */}
      <div className="relative w-64 h-64 flex items-center justify-center my-4">
        {/* Rotating Wooden Wheel */}
        <div
          className="w-32 h-32 rounded-full bg-[#8b5a2b] border-4 border-[#5c3a21] shadow-2xl flex items-center justify-center relative transition-transform duration-75"
          style={{ transform: `rotate(${logRotation}deg)` }}
        >
          <div className="w-12 h-12 rounded-full bg-[#5c3a21] border border-amber-900/60" />

          {/* Embedded knives in log */}
          {knivesInLog.map((angle, idx) => (
            <div
              key={idx}
              className="absolute w-1.5 h-10 bg-slate-300 rounded origin-bottom"
              style={{
                transform: `rotate(${angle}deg) translateY(-54px)`
              }}
            />
          ))}
        </div>

        {/* Ready knife at bottom */}
        <div className={`absolute bottom-0 w-2.5 h-12 bg-gradient-to-t from-slate-400 to-white rounded shadow-lg transition-transform ${
          isThrowing ? '-translate-y-24' : ''
        }`} />
      </div>

      <button
        onClick={throwKnife}
        disabled={isThrowing || knivesLeft <= 0}
        className="w-full max-w-xs py-4 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 text-slate-950 font-black text-sm shadow-xl active:scale-95 transition-all disabled:opacity-40"
      >
        🗡️ THROW KNIFE
      </button>
    </div>
  );
};

/* ========================================================================= */
/* 5. CANDY MATCH 3                                                          */
/* ========================================================================= */
const CandyMatchGame: React.FC<{ session: any; onFinish: (p: number, b: number) => void }> = ({ session, onFinish }) => {
  const targetResult = session.targetResult;
  const [score, setScore] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(25);

  const CANDIES = ['🍬', '🍭', '🍫', '🍩', '🍪'];
  const [grid, setGrid] = useState<string[][]>(() => {
    return Array.from({ length: 5 }, () =>
      Array.from({ length: 5 }, () => CANDIES[Math.floor(Math.random() * CANDIES.length)])
    );
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timer);
          const botScore = targetResult === 'LOST' ? 450 : 180;
          setTimeout(() => onFinish(score, botScore), 300);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [score, targetResult, onFinish]);

  const handleTileClick = (r: number, c: number) => {
    sound.playMatch();
    setScore((s) => s + 30);

    // Randomize nearby tiles
    setGrid((prev) => {
      const copy = prev.map((row) => [...row]);
      copy[r][c] = CANDIES[Math.floor(Math.random() * CANDIES.length)];
      if (r > 0) copy[r - 1][c] = CANDIES[Math.floor(Math.random() * CANDIES.length)];
      if (c > 0) copy[r][c - 1] = CANDIES[Math.floor(Math.random() * CANDIES.length)];
      return copy;
    });
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-between text-center select-none space-y-3">
      {/* Header */}
      <div className="w-full bg-slate-900 rounded-2xl border border-slate-800 p-3 flex justify-between items-center text-xs font-mono">
        <div>
          <span className="text-slate-400 block text-[10px]">CANDY SCORE</span>
          <span className="text-lg font-black text-purple-400">{score}</span>
        </div>
        <div className="text-center">
          <span className="text-slate-400 block text-[10px]">TIME LEFT</span>
          <span className="text-lg font-black text-amber-400">{timeLeft}s</span>
        </div>
        <div className="text-right">
          <span className="text-slate-400 block text-[10px]">BOT SCORE</span>
          <span className="text-sm font-bold text-rose-400">
            {targetResult === 'LOST' ? Math.floor(score * 1.5 + 60) : Math.floor(score * 0.7)}
          </span>
        </div>
      </div>

      {/* 5x5 Candy Grid */}
      <div className="p-3 rounded-3xl bg-[#120f24] border-2 border-purple-500/30 shadow-2xl">
        <div className="grid grid-cols-5 gap-2">
          {grid.map((row, rIdx) =>
            row.map((candy, cIdx) => (
              <button
                key={`${rIdx}-${cIdx}`}
                onClick={() => handleTileClick(rIdx, cIdx)}
                className="w-12 h-12 rounded-xl bg-slate-900/90 border border-purple-500/20 text-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
              >
                {candy}
              </button>
            ))
          )}
        </div>
      </div>

      <p className="text-xs text-slate-400">
        Candies par tap karke match banayein aur score badahein!
      </p>
    </div>
  );
};
