
import React, { useState, useEffect } from 'react';
import './App.css'; // Import the new styles
import { PhaserGame } from './game/PhaserGame';
import { GameOverlay } from './components/GameOverlay';
import { UpgradeOption, UPGRADE_POOL_DATA } from './types';
import { EventBus } from './services/EventBus';
import { network } from './services/NetworkService';
import { persistence } from './services/PersistenceService';

const App: React.FC = () => {
    // Exact same state logic as before
    const [gameState, setGameState] = useState<'BOOT' | 'LOBBY' | 'PLAYING' | 'GAMEOVER'>('BOOT');
    const [lobbyMode, setLobbyMode] = useState<'SOLO' | 'DUO'>('SOLO');

    const [showLevelUp, setShowLevelUp] = useState(false);
    const [randomUpgrades, setRandomUpgrades] = useState<UpgradeOption[]>([]);

    const [highScore, setHighScore] = useState(0);
    const [saveCode, setSaveCode] = useState<string>('');
    const [importInput, setImportInput] = useState<string>('');
    const [showSaveUI, setShowSaveUI] = useState(false);

    const [bootProgress, setBootProgress] = useState(0);

    const [connectionStatus, setConnectionStatus] = useState<'IDLE' | 'CONNECTING' | 'CONNECTED'>('IDLE');
    const [hostId, setHostId] = useState<string>('');
    const [joinId, setJoinId] = useState<string>('');
    const [isHost, setIsHost] = useState(false);

    useEffect(() => {
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
        <>
            <div className={`ui-layer ${gameState === 'LOBBY' ? 'opacity-50' : 'opacity-100'}`} style={{ zIndex: 0 }}>
                <PhaserGame />
            </div>

            {gameState === 'PLAYING' && <GameOverlay />}

            {/* BOOT SCREEN */}
            {gameState === 'BOOT' && (
                <div className="ui-layer" style={{ background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '4rem', animation: 'float 2s infinite' }}>🐰</div>
                        <div style={{ width: '200px', height: '10px', background: '#eee', borderRadius: '10px', margin: '20px auto', overflow: 'hidden' }}>
                            <div style={{ width: `${bootProgress}%`, height: '100%', background: `var(--primary-1)`, transition: 'width 0.2s' }}></div>
                        </div>
                        <div style={{ color: 'var(--primary-1)', fontWeight: 'bold' }}>LOADING...</div>
                    </div >
                </div >
            )}

            {/* LOBBY */}
            {
                gameState === 'LOBBY' && (
                    <div className="ui-container">

                        <div className="title-text">突觸</div>
                        <div className="subtitle-text">口袋版</div>

                        <div className="mode-switch">
                            <button
                                className={`mode-btn ${lobbyMode === 'SOLO' ? 'active' : ''}`}
                                onClick={() => setLobbyMode('SOLO')}
                            >
                                單人模式
                            </button>
                            <button
                                className={`mode-btn duo ${lobbyMode === 'DUO' ? 'active' : ''}`}
                                onClick={() => setLobbyMode('DUO')}
                            >
                                雙人模式
                            </button>
                        </div>

                        <div className="glass-card">
                            {/* Connection Overlay for Duo */}
                            {lobbyMode === 'DUO' && (
                                <div style={{ marginBottom: '20px' }}>
                                    {connectionStatus === 'IDLE' && (
                                        <>
                                            <button className="bubble-btn purple" onClick={handleHostGame}>建立房間 🏠</button>
                                            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                                <input
                                                    className="cute-input"
                                                    placeholder="房間代碼"
                                                    value={joinId}
                                                    onChange={e => setJoinId(e.target.value)}
                                                    style={{ margin: 0 }}
                                                />
                                                <button className="bubble-btn blue" style={{ width: 'auto', margin: 0 }} onClick={handleJoinGame}>加入</button>
                                            </div>
                                        </>
                                    )}

                                    {connectionStatus === 'CONNECTING' && (
                                        <div style={{ textAlign: 'center', padding: '20px', color: '#DAA520', fontWeight: 'bold' }}>
                                            {isHost ? `Room ID: ${hostId}` : 'Joining...'}
                                            <div style={{ fontSize: '2rem', marginTop: '10px' }} className="animate-spin">🍩</div>
                                        </div>
                                    )}

                                    {connectionStatus === 'CONNECTED' && (
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '2rem' }}>✨ Connected! ✨</div>
                                            {isHost ? (
                                                <button className="bubble-btn green" style={{ marginTop: '20px' }} onClick={handleStartDuo}>START GAME</button>
                                            ) : (
                                                <div style={{ marginTop: '20px', color: '#999' }}>Waiting for host...</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Main Solo Action */}
                            {lobbyMode === 'SOLO' && (
                                <div style={{ marginBottom: '20px' }}>
                                    <button className="bubble-btn" onClick={handleStartSolo}>開始單人 ▶</button>
                                    <p style={{ textAlign: 'center', color: '#888', fontSize: '0.8rem', marginTop: '10px' }}>
                                        離線模式 • AI 助手已啟動
                                    </p>
                                </div>
                            )}

                            {/* Stats / Data */}
                            <div style={{ borderTop: '2px solid #F0F0F0', paddingTop: '20px' }}>
                                <div className="stat-box">
                                    <div>
                                        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#AAA', fontWeight: 'bold' }}>High Score</div>
                                        <div style={{ fontSize: '1.2rem', color: '#555', fontWeight: 'bold' }}>{highScore.toLocaleString()}</div>
                                    </div>
                                    <button
                                        onClick={() => setShowSaveUI(!showSaveUI)}
                                        style={{ background: 'white', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}
                                    >
                                        ⚙️
                                    </button>
                                </div>

                                {showSaveUI && (
                                    <div style={{ background: '#FAFAFA', padding: '10px', borderRadius: '15px' }}>
                                        <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '5px' }}>保存碼（點擊複製）：</div>
                                        <div style={{ background: 'white', padding: '8px', borderRadius: '8px', fontSize: '0.7rem', wordBreak: 'break-all', border: '1px solid #EEE' }} onClick={generateSaveCode}>
                                            {saveCode || '(Tap to Generate)'}
                                        </div>
                                        <div style={{ display: 'flex', marginTop: '10px', gap: '5px' }}>
                                            <input
                                                className="cute-input"
                                                style={{ padding: '8px', fontSize: '0.8rem', margin: 0 }}
                                                placeholder="Paste Code"
                                                value={importInput}
                                                onChange={e => setImportInput(e.target.value)}
                                            />
                                            <button className="bubble-btn green" style={{ width: 'auto', padding: '8px 12px', fontSize: '0.8rem', margin: 0 }} onClick={importSaveData}>載入</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* GAME OVER */}
            {
                gameState === 'GAMEOVER' && (
                    <div className="ui-container">
                        <div className="glass-card" style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '3rem' }}>💀</div>
                            <h2 style={{ fontFamily: 'Fredoka', color: '#555' }}>遊戲結束</h2>
                            <button className="bubble-btn" onClick={() => { setGameState('LOBBY'); setConnectionStatus('IDLE'); }}>返回主選單</button>
                        </div>
                    </div>
                )
            }

            {/* LEVEL UP */}
            {
                showLevelUp && (
                    <div className="ui-container">
                        <div className="glass-card">
                            <h2 style={{ textAlign: 'center', color: '#FFD700', fontFamily: 'Fredoka' }}>升級！</h2>
                            {randomUpgrades.map((u, i) => (
                                <button
                                    key={i}
                                    className="bubble-btn blue"
                                    style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '12px 20px' }}
                                    onClick={() => handleSelectUpgrade(u)}
                                >
                                    <span style={{ fontSize: '1rem' }}>{u.title}</span>
                                    <span style={{ fontSize: '0.7rem', opacity: 0.8, fontWeight: 'normal' }}>{u.description}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )
            }
        </>
    );
};

export default App;
