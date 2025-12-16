
import React, { useState, useEffect } from 'react';
import { PhaserGame } from './game/PhaserGame';
import { GameOverlay } from './components/GameOverlay';
import { UpgradeOption, UPGRADE_POOL_DATA } from './types';
import { EventBus } from './services/EventBus';
import { network } from './services/NetworkService';

// --- Reusable UI Components ---

const CornerBrackets = ({ color = "text-cyan-500" }) => (
    <>
        <svg className={`absolute top-0 left-0 w-8 h-8 ${color}`} viewBox="0 0 32 32">
            <path d="M1 31 V 1 H 31" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
        <svg className={`absolute top-0 right-0 w-8 h-8 ${color}`} viewBox="0 0 32 32">
            <path d="M1 1 H 31 V 31" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
        <svg className={`absolute bottom-0 right-0 w-8 h-8 ${color}`} viewBox="0 0 32 32">
            <path d="M31 1 V 31 H 1" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
        <svg className={`absolute bottom-0 left-0 w-8 h-8 ${color}`} viewBox="0 0 32 32">
            <path d="M31 31 H 1 V 1" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
    </>
);

const HexButton = ({ onClick, children, primary = true, disabled = false }: { onClick: () => void, children?: React.ReactNode, primary?: boolean, disabled?: boolean }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`
      relative group px-8 py-4 w-full font-['Rajdhani'] font-bold text-xl tracking-[0.2em] uppercase transition-all duration-200
      ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : ''}
      ${primary
                ? 'text-black hover:text-white'
                : 'text-cyan-400 hover:text-white border border-cyan-900/50 hover:border-cyan-400/50 bg-black/40'}
    `}
        style={{ clipPath: 'polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)' }}
    >
        {/* Background Fill for Primary */}
        {primary && !disabled && (
            <div className="absolute inset-0 bg-cyan-400 group-hover:bg-cyan-500 transition-colors -z-10"></div>
        )}

        {/* Decor Lines */}
        <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-white/40"></div>
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-white/40"></div>

        {children}
    </button>
);

const App: React.FC = () => {
    const [gameState, setGameState] = useState<'BOOT' | 'LOBBY' | 'PLAYING' | 'GAMEOVER'>('BOOT');
    const [showLevelUp, setShowLevelUp] = useState(false);
    const [randomUpgrades, setRandomUpgrades] = useState<UpgradeOption[]>([]);

    // Stats for Game Over Report
    const [lastStats, setLastStats] = useState({ score: 0, wave: 1, level: 1 });
    const [highScore, setHighScore] = useState(0);

    // Boot Animation State
    const [bootProgress, setBootProgress] = useState(0);

    // Network State
    const [connectionStatus, setConnectionStatus] = useState<'IDLE' | 'CONNECTING' | 'CONNECTED'>('IDLE');
    const [hostId, setHostId] = useState<string>('');
    const [joinId, setJoinId] = useState<string>('');
    const [isHost, setIsHost] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('SYNAPSE_HIGHSCORE');
        if (saved) setHighScore(parseInt(saved, 10));

        // Boot Sequence Simulation
        const interval = setInterval(() => {
            setBootProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    setTimeout(() => setGameState('LOBBY'), 500); // Small delay after 100%
                    return 100;
                }
                return prev + (Math.random() * 8);
            });
        }, 50);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const onLevelUp = (level: number) => {
            const shuffled = [...UPGRADE_POOL_DATA].sort(() => 0.5 - Math.random());
            setRandomUpgrades(shuffled.slice(0, 3));
            setShowLevelUp(true);
        };

        const onGameOver = (data: { score: number, wave: number, level: number }) => {
            setLastStats(data);
            setGameState('GAMEOVER');
            if (data.score > highScore) {
                setHighScore(data.score);
                localStorage.setItem('SYNAPSE_HIGHSCORE', data.score.toString());
            }
        };

        const onNETWORK_CONNECTED = () => {
            setConnectionStatus('CONNECTED');
        };

        const onNETWORK_DISCONNECTED = () => {
            setConnectionStatus('IDLE');
            setGameState('GAMEOVER'); // Or back to lobby
        };

        const onSTART_MATCH = () => {
            setGameState('PLAYING');
        };

        EventBus.on('LEVEL_UP', onLevelUp);
        EventBus.on('GAME_OVER', onGameOver);
        EventBus.on('NETWORK_CONNECTED', onNETWORK_CONNECTED);
        EventBus.on('NETWORK_DISCONNECTED', onNETWORK_DISCONNECTED);
        EventBus.on('START_MATCH', onSTART_MATCH);

        return () => {
            EventBus.off('LEVEL_UP', onLevelUp);
            EventBus.off('GAME_OVER', onGameOver);
            EventBus.off('NETWORK_CONNECTED', onNETWORK_CONNECTED);
            EventBus.off('NETWORK_DISCONNECTED', onNETWORK_DISCONNECTED);
            EventBus.off('START_MATCH', onSTART_MATCH);
        };
    }, [highScore]);

    const handleStartGame = () => {
        // Only Host can start
        if (isHost && connectionStatus === 'CONNECTED') {
            network.broadcast({ type: 'START_MATCH' });
            EventBus.emit('START_MATCH'); // Local Trigger
            setGameState('PLAYING');
        }
    };

    const handleSelectUpgrade = (upgrade: UpgradeOption) => {
        EventBus.emit('APPLY_UPGRADE', upgrade.type);
        setShowLevelUp(false);
    };

    const handleHostGame = async () => {
        setConnectionStatus('CONNECTING');
        setIsHost(true);
        const id = await network.initialize();
        setHostId(id);
    };

    const handleJoinGame = async () => {
        if (!joinId) return;
        setConnectionStatus('CONNECTING');
        setIsHost(false);
        await network.initialize(); // Init our own peer
        network.connectToHost(joinId);
    };

    return (
        <div className="w-full h-full relative overflow-hidden select-none bg-[#050508] text-white font-['Rajdhani']">

            {/* Phaser is always mounted but hidden in Lobby/Boot to keep state ready if needed, or purely background */}
            <div className={`transition-opacity duration-1000 ${gameState === 'LOBBY' ? 'opacity-30 blur-sm' : 'opacity-100'}`}>
                <PhaserGame />
            </div>

            {/* --- GLOBAL VFX LAYER --- */}
            {/* Grid Overlay */}
            <div className="absolute inset-0 pointer-events-none z-10 opacity-10"
                style={{ backgroundImage: 'linear-gradient(rgba(0, 240, 255, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 240, 255, 0.3) 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
            </div>
            {/* Vignette */}
            <div className="absolute inset-0 z-20 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,#000000_120%)]"></div>

            {/* --- UI LAYERS --- */}

            {/* IN-GAME HUD */}
            {gameState === 'PLAYING' && <GameOverlay />}

            {/* BOOT SCREEN */}
            {gameState === 'BOOT' && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black">
                    <div className="w-80 relative">
                        <div className="flex justify-between text-cyan-500 font-mono text-xs mb-1">
                            <span>BIOS_CHECK</span>
                            <span>{Math.floor(bootProgress)}%</span>
                        </div>
                        <div className="w-full h-1 bg-gray-900 border border-cyan-900/50">
                            <div className="h-full bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.8)]" style={{ width: `${bootProgress}%` }}></div>
                        </div>
                        <div className="mt-4 font-mono text-[10px] text-cyan-700/80 space-y-1">
                            <div className="opacity-50">Loading assets... OK</div>
                            <div className="opacity-70">Initializing physics engine... OK</div>
                            {bootProgress > 50 && <div className="opacity-90">Establishing neural link...</div>}
                            {bootProgress > 90 && <div className="text-cyan-400 animate-pulse">SYSTEM READY</div>}
                        </div>
                    </div>
                </div>
            )}

            {/* LOBBY / MAIN MENU */}
            {gameState === 'LOBBY' && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="relative w-full max-w-lg p-6 md:p-10 flex flex-col items-center my-auto">
                        {/* Decorative Borders */}
                        <CornerBrackets />

                        {/* Title Section */}
                        <div className="mb-8 md:mb-12 text-center relative">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-cyan-500/20 blur-3xl opacity-20 pointer-events-none"></div>
                            <h5 className="text-cyan-500 tracking-[0.8em] text-xs font-bold mb-2 uppercase">Geometric Warfare Protocol</h5>
                            <h1 className="text-6xl md:text-8xl font-black text-white italic tracking-tighter drop-shadow-[0_0_10px_rgba(0,240,255,0.5)]">
                                SYNAPSE
                            </h1>
                            <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-500 to-transparent mt-4"></div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-4 w-full mb-8 md:mb-10">
                            <div className="bg-black/40 border border-gray-800 p-4 relative group hover:border-cyan-500/50 transition-colors">
                                <div className="text-gray-500 text-[10px] uppercase tracking-widest mb-1">High Score</div>
                                <div className="font-['Share_Tech_Mono'] text-2xl text-cyan-300">{highScore.toLocaleString()}</div>
                                <div className="absolute bottom-0 right-0 w-2 h-2 bg-gray-700 group-hover:bg-cyan-500 transition-colors"></div>
                            </div>
                            <div className="bg-black/40 border border-gray-800 p-4 relative">
                                <div className="text-gray-500 text-[10px] uppercase tracking-widest mb-1">Server Region</div>
                                <div className="font-['Share_Tech_Mono'] text-2xl text-emerald-400">ASIA-01</div>
                                <div className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 animate-pulse"></div>
                            </div>
                        </div>

                        {/* P2P Actions */}
                        <div className="w-full space-y-6">

                            {connectionStatus === 'IDLE' && (
                                <div className="flex flex-col space-y-4">
                                    {/* HOST SECTION */}
                                    <div className="p-4 border border-cyan-900/50 bg-black/40">
                                        <h3 className="text-cyan-500 text-xs tracking-widest uppercase mb-2">Create Session</h3>
                                        <HexButton onClick={handleHostGame} primary={false}>
                                            Initialize Host
                                        </HexButton>
                                    </div>

                                    {/* JOIN SECTION */}
                                    <div className="p-4 border border-cyan-900/50 bg-black/40">
                                        <h3 className="text-cyan-500 text-xs tracking-widest uppercase mb-2">Join Session</h3>
                                        <div className="flex space-x-2 mb-2">
                                            <input
                                                type="text"
                                                value={joinId}
                                                onChange={(e) => setJoinId(e.target.value)}
                                                placeholder="ENTER HOST ID"
                                                className="w-full bg-black/50 border border-gray-700 text-cyan-400 p-2 font-mono text-sm focus:border-cyan-500 outline-none uppercase"
                                            />
                                        </div>
                                        <HexButton onClick={handleJoinGame} primary={false}>
                                            Connect
                                        </HexButton>
                                    </div>
                                </div>
                            )}

                            {connectionStatus === 'CONNECTING' && (
                                <div className="text-center p-6 border border-yellow-500/30 bg-yellow-900/10 animate-pulse">
                                    <div className="text-yellow-500 tracking-widest text-sm mb-2">ESTABLISHING LINK...</div>
                                    {isHost && hostId && (
                                        <div className="mt-4">
                                            <div className="text-xs text-gray-500 mb-1">SHARE THIS ID:</div>
                                            <div className="font-mono text-xl text-white select-all bg-black/50 p-2 border border-white/10">{hostId}</div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {connectionStatus === 'CONNECTED' && (
                                <div className="space-y-4 animate-in fade-in zoom-in duration-300">
                                    <div className="p-4 bg-emerald-900/20 border border-emerald-500/50 text-center">
                                        <div className="text-emerald-400 tracking-widest text-sm">NEURAL LINK ACTIVE</div>
                                        <div className="text-[10px] text-emerald-400/60 mt-1">Ready to sync</div>
                                    </div>

                                    {isHost ? (
                                        <HexButton onClick={handleStartGame} primary={true}>
                                            EXECUTE PROTOCOL
                                        </HexButton>
                                    ) : (
                                        <div className="text-center p-4 border border-cyan-500/20">
                                            <div className="text-cyan-400 animate-pulse text-sm tracking-widest">WAITING FOR HOST...</div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="text-center">
                                <p className="text-[10px] text-gray-500 tracking-widest mt-4">V 1.0.0 // P2P ENABLED</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* GAME OVER */}
            {gameState === 'GAMEOVER' && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-red-950/80 backdrop-blur-md">
                    <div className="relative w-full max-w-md p-8 bg-black/80 border border-red-900/50 shadow-[0_0_50px_rgba(220,38,38,0.2)]">
                        <CornerBrackets color="text-red-600" />

                        <div className="text-center mb-8">
                            <h2 className="text-5xl font-black text-red-500 tracking-tight drop-shadow-[0_0_10px_rgba(220,38,38,0.8)]">CONNECTION LOST</h2>
                            <p className="text-red-400/60 text-xs tracking-[0.5em] mt-2 uppercase">Mission Failed</p>
                        </div>

                        <div className="space-y-4 mb-8">
                            <div className="flex justify-between items-center border-b border-red-900/30 pb-2">
                                <span className="text-gray-500 text-sm">WAVES CLEARED</span>
                                <span className="font-['Share_Tech_Mono'] text-2xl text-white">{lastStats.wave}</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-red-900/30 pb-2">
                                <span className="text-gray-500 text-sm">SYNC LEVEL</span>
                                <span className="font-['Share_Tech_Mono'] text-2xl text-cyan-400">{lastStats.level}</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-red-900/30 pb-2">
                                <span className="text-gray-500 text-sm">TOTAL SCORE</span>
                                <span className="font-['Share_Tech_Mono'] text-3xl text-yellow-500">{lastStats.score.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {/* Only Host "Reboot" logic is tricky in P2P without re-handshaking. 
                          For MVP, return to Lobby is safer. */}
                            <button
                                onClick={() => { setGameState('LOBBY'); setConnectionStatus('IDLE'); }} // Full reset?
                                className="w-full text-center text-xs text-red-500/50 hover:text-red-400 uppercase tracking-widest mt-4"
                            >
                                Return to Lobby (Disconnect)
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* UPGRADE MODAL */}
            {showLevelUp && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="w-full max-w-2xl px-4">
                        <div className="text-center mb-8">
                            <h2 className="text-3xl font-bold text-yellow-400 tracking-widest uppercase drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]">
                                System Upgrade
                            </h2>
                            <p className="text-xs text-yellow-400/50 tracking-[0.3em] mt-1">SELECT ENHANCEMENT MODULE</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {randomUpgrades.map((u, i) => (
                                <div
                                    key={i}
                                    onClick={() => handleSelectUpgrade(u)}
                                    className="group relative cursor-pointer border border-white/10 bg-gray-900/80 hover:bg-gray-800 p-6 transition-all hover:scale-105"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <div className={`w-12 h-1 mb-4 bg-gradient-to-r ${u.color}`}></div>
                                    <h3 className="font-bold text-lg text-white mb-2">{u.title}</h3>
                                    <p className="text-xs text-gray-400 leading-relaxed font-mono">{u.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;
