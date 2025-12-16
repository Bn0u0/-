
import React, { useState, useEffect } from 'react';
import { PhaserGame } from './game/PhaserGame';
import { GameOverlay } from './components/GameOverlay';
import { UpgradeOption, UPGRADE_POOL_DATA } from './types';
import { EventBus } from './services/EventBus';
import { network } from './services/NetworkService';
import { persistence } from './services/PersistenceService';

// --- Reusable Cute UI Components ---
const BubbleButton = ({ onClick, children, color = "bg-blue-400", disabled = false, size = "md" }: any) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`
      relative group w-full rounded-3xl font-['Fredoka'] font-bold text-white tracking-wide shadow-[0_6px_0_rgba(0,0,0,0.1)] active:shadow-none active:translate-y-1 transition-all duration-150
      ${size === 'sm' ? 'py-2 px-4 text-sm' : 'py-4 px-6 text-xl'}
      ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : `${color} hover:brightness-110`}
    `}
    >
        {children}
    </button>
);

const Card = ({ children, className = "" }: any) => (
    <div className={`bg-white/80 backdrop-blur-md rounded-3xl p-6 shadow-xl border-4 border-white ${className}`}>
        {children}
    </div>
);

const App: React.FC = () => {
    const [gameState, setGameState] = useState<'BOOT' | 'LOBBY' | 'PLAYING' | 'GAMEOVER'>('BOOT');
    const [lobbyMode, setLobbyMode] = useState<'SOLO' | 'DUO'>('SOLO'); // Sub-state for Lobby

    const [showLevelUp, setShowLevelUp] = useState(false);
    const [randomUpgrades, setRandomUpgrades] = useState<UpgradeOption[]>([]);

    // Persistence State
    const [highScore, setHighScore] = useState(0);
    const [saveCode, setSaveCode] = useState<string>(''); // For export
    const [importInput, setImportInput] = useState<string>(''); // For import
    const [showSaveUI, setShowSaveUI] = useState(false);

    const [bootProgress, setBootProgress] = useState(0);

    // Network
    const [connectionStatus, setConnectionStatus] = useState<'IDLE' | 'CONNECTING' | 'CONNECTED'>('IDLE');
    const [hostId, setHostId] = useState<string>('');
    const [joinId, setJoinId] = useState<string>('');
    const [isHost, setIsHost] = useState(false);

    useEffect(() => {
        // Load Data
        const data = persistence.load();
        setHighScore(data.highScore);

        const interval = setInterval(() => {
            setBootProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    setTimeout(() => setGameState('LOBBY'), 500);
                    return 100;
                }
                return prev + 15;
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
            setGameState('GAMEOVER');

            // Check High Score with Persistence
            const currentData = persistence.getData();
            if (data.score > currentData.highScore) {
                setHighScore(data.score);
                persistence.save({ highScore: data.score, totalGamesPlayed: currentData.totalGamesPlayed + 1 });
            } else {
                persistence.save({ totalGamesPlayed: currentData.totalGamesPlayed + 1 });
            }
        };

        const onNETWORK_CONNECTED = () => setConnectionStatus('CONNECTED');
        const onNETWORK_DISCONNECTED = () => {
            setConnectionStatus('IDLE');
            setGameState('GAMEOVER');
        };

        const onSTART_MATCH = () => setGameState('PLAYING');

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
    }, []);

    // --- Actions ---

    const handleStartSolo = () => {
        EventBus.emit('START_MATCH', 'SINGLE');
        setGameState('PLAYING');
    };

    const handleStartDuo = () => {
        if (isHost && connectionStatus === 'CONNECTED') {
            network.broadcast({ type: 'START_MATCH' });
            EventBus.emit('START_MATCH', 'MULTI');
            setGameState('PLAYING');
        }
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
        await network.initialize();
        network.connectToHost(joinId);
    };

    const generateSaveCode = () => {
        const code = persistence.exportSaveCode();
        setSaveCode(code);
    };

    const importSaveData = () => {
        if (persistence.importSaveCode(importInput)) {
            alert('Data recovered successfully!');
            setHighScore(persistence.getData().highScore);
            setImportInput('');
        } else {
            alert('Invalid Code!');
        }
    };

    const handleSelectUpgrade = (upgrade: UpgradeOption) => {
        EventBus.emit('APPLY_UPGRADE', upgrade.type);
        setShowLevelUp(false);
    };

    return (
        <div className="w-full h-full relative overflow-hidden select-none bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 font-['Varela_Round'] text-gray-700">

            <div className={`transition-opacity duration-1000 ${gameState === 'LOBBY' ? 'opacity-50' : 'opacity-100'}`}>
                <PhaserGame />
            </div>

            {/* HUD */}
            {gameState === 'PLAYING' && <GameOverlay />}

            {/* LOBBY */}
            {gameState === 'LOBBY' && (
                <div className="absolute inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="relative w-full max-w-md my-auto flex flex-col items-center">

                        {/* Logo & Mode Switcher */}
                        <div className="mb-6 text-center w-full">
                            <h1 className="text-5xl font-['Fredoka'] font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400 drop-shadow-sm pb-2">
                                SYNAPSE
                            </h1>

                            {/* Mode Toggle */}
                            <div className="flex bg-white/50 rounded-full p-1 mx-auto w-max mb-4 backdrop-blur-sm">
                                <button
                                    onClick={() => setLobbyMode('SOLO')}
                                    className={`px-6 py-2 rounded-full font-bold transition-all ${lobbyMode === 'SOLO' ? 'bg-pink-400 text-white shadow-md' : 'text-gray-400 hover:text-pink-400'}`}
                                >
                                    🌸 Solo
                                </button>
                                <button
                                    onClick={() => setLobbyMode('DUO')}
                                    className={`px-6 py-2 rounded-full font-bold transition-all ${lobbyMode === 'DUO' ? 'bg-purple-400 text-white shadow-md' : 'text-gray-400 hover:text-purple-400'}`}
                                >
                                    ⚔️ Duo
                                </button>
                            </div>
                        </div>

                        <Card className="w-full space-y-6">
                            {/* Stats with Save Settings Trigger */}
                            <div className="flex justify-between items-center bg-blue-50 rounded-2xl p-4 border border-blue-100">
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">High Score</span>
                                    <span className="text-xl font-bold text-blue-600">{highScore.toLocaleString()}</span>
                                </div>
                                <button
                                    onClick={() => { setShowSaveUI(!showSaveUI); generateSaveCode(); }}
                                    className="w-10 h-10 rounded-full bg-white border border-blue-100 flex items-center justify-center text-blue-400 hover:bg-blue-100 transition-colors"
                                >
                                    ⚙️
                                </button>
                            </div>

                            {/* SAVE UI DROPDOWN */}
                            {showSaveUI && (
                                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 animate-in fade-in slide-in-from-top-2">
                                    <h3 className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Data Management</h3>

                                    {/* Export */}
                                    <div className="mb-4">
                                        <div className="text-xs text-gray-500 mb-1">Your ID Code (Copy to Backup)</div>
                                        <div className="bg-white p-2 rounded-xl text-[10px] break-all border border-gray-200 font-mono select-all text-gray-600">
                                            {saveCode || 'Generating...'}
                                        </div>
                                    </div>

                                    {/* Import */}
                                    <div className="flex gap-2">
                                        <input
                                            className="flex-1 bg-white border border-gray-200 rounded-xl px-2 py-1 text-xs"
                                            placeholder="Paste ID Code here..."
                                            value={importInput}
                                            onChange={(e) => setImportInput(e.target.value)}
                                        />
                                        <BubbleButton size="sm" color="bg-orange-400" onClick={importSaveData}>
                                            Recover
                                        </BubbleButton>
                                    </div>
                                </div>
                            )}

                            {/* SOLO MODE UI */}
                            {lobbyMode === 'SOLO' && (
                                <div className="text-center space-y-4 animate-in fade-in zoom-in">
                                    <div className="p-4 bg-pink-50 rounded-2xl border border-pink-100 text-pink-500 text-sm">
                                        Play offline with AI Drone Assistant.
                                    </div>
                                    <BubbleButton onClick={handleStartSolo} color="bg-pink-400">
                                        Play Solo 🌸
                                    </BubbleButton>
                                </div>
                            )}

                            {/* DUO MODE UI */}
                            {lobbyMode === 'DUO' && (
                                <div className="space-y-4 animate-in fade-in zoom-in">
                                    {connectionStatus === 'IDLE' && (
                                        <>
                                            <BubbleButton onClick={handleHostGame} color="bg-purple-400">Create Room</BubbleButton>
                                            <div className="flex space-x-2">
                                                <input
                                                    type="text"
                                                    value={joinId}
                                                    onChange={(e) => setJoinId(e.target.value)}
                                                    placeholder="Room ID"
                                                    className="w-full bg-gray-50 border-2 border-gray-200 p-3 rounded-2xl font-bold text-center outline-none focus:border-purple-400"
                                                />
                                                <BubbleButton onClick={handleJoinGame} color="bg-blue-400" size="sm">Join</BubbleButton>
                                            </div>
                                        </>
                                    )}

                                    {connectionStatus === 'CONNECTING' && (
                                        <div className="text-center py-4 bg-yellow-50 rounded-2xl border border-yellow-100">
                                            <div className="text-2xl animate-spin mb-2">⏳</div>
                                            <div className="text-yellow-600 font-bold">Connecting...</div>
                                            {isHost && hostId && (
                                                <div className="mt-2 text-xl font-black select-all">{hostId}</div>
                                            )}
                                        </div>
                                    )}

                                    {connectionStatus === 'CONNECTED' && (
                                        <div className="text-center space-y-4">
                                            <div className="bg-green-50 p-4 rounded-2xl text-green-500 font-bold">Connected!</div>
                                            {isHost ? (
                                                <BubbleButton onClick={handleStartDuo} color="bg-green-400">Start Duo Match</BubbleButton>
                                            ) : (
                                                <div className="text-gray-400 animate-pulse">Waiting for Host...</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </Card>
                    </div>
                </div>
            )}

            {/* GAME OVER CARD - Reuse from previous step but generic */}
            {gameState === 'GAMEOVER' && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <Card className="w-full max-w-sm text-center">
                        <h2 className="text-3xl font-['Fredoka'] font-bold text-gray-700 mb-4">GAME OVER</h2>
                        <BubbleButton onClick={() => { setGameState('LOBBY'); setConnectionStatus('IDLE'); }} color="bg-gray-400">
                            Back to Menu
                        </BubbleButton>
                    </Card>
                </div>
            )}

            {/* UPGRADE CARD - Same as before ... */}
            {showLevelUp && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md bg-white rounded-3xl p-6">
                        <h2 className="text-2xl font-bold text-center mb-4">Level Up!</h2>
                        <div className="space-y-3">
                            {randomUpgrades.map((u, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleSelectUpgrade(u)}
                                    className="w-full bg-gray-50 hover:bg-gray-100 rounded-xl p-4 text-left border border-gray-100"
                                >
                                    <div className="font-bold text-gray-700">{u.title}</div>
                                    <div className="text-xs text-gray-500">{u.description}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;
