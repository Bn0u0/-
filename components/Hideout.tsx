import React, { useEffect, useState } from 'react';
import { metaGame } from '../services/MetaGameService';
import { inventoryService } from '../services/InventoryService';
import { InventoryItem, ItemType } from '../game/data/Items';

export const Hideout: React.FC = () => {
    // Local state for UI refresh
    const [stash, setStash] = useState<InventoryItem[]>([]);
    const [credits, setCredits] = useState(0);
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

    useEffect(() => {
        refreshData();
    }, []);

    const refreshData = () => {
        const state = inventoryService.getState();
        setStash([...state.stash]); // Copy to trigger re-render
        setCredits(state.credits);
        setSelectedItem(null);
    };

    const handleDeploy = () => {
        metaGame.startGame();
    };

    const handleDecrypt = (item: InventoryItem) => {
        // Gacha time!
        const result = inventoryService.decryptArtifact(item.id);
        if (result) {
            // Show some animation or alert? For MVP, just refresh and show "NEW"
            alert(`Decrypted! You got: ${result.defId}`); // Placeholder for juice
            refreshData();
        }
    };

    const handleSell = (item: InventoryItem) => {
        inventoryService.sellItem(item.id);
        refreshData();
    };

    // --- Renders ---

    return (
        <div className="ui-layer" style={{ pointerEvents: 'auto', background: '#1a1a2e' }}>
            {/* Header */}
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: '80px',
                background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', padding: '0 40px',
                justifyContent: 'space-between', borderBottom: '1px solid #333'
            }}>
                <div className="title-text" style={{ fontSize: '2rem', margin: 0, textAlign: 'left' }}>
                    基地 <span style={{ fontSize: '1rem', color: '#666' }}>// HIDEOUT</span>
                </div>
                <div style={{ color: '#00FFFF', fontSize: '1.5rem', fontFamily: 'monospace' }}>
                    💎 {credits.toLocaleString()} CR
                </div>
            </div>

            {/* Main Content Grid */}
            <div style={{
                position: 'absolute', top: '80px', bottom: '80px', left: '40px', right: '40px',
                display: 'flex', gap: '20px', paddingTop: '20px'
            }}>
                {/* LEFT: Hero Preview (Placeholder for now) */}
                <div className="glass-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ fontSize: '5rem' }}>🤖</div>
                    <h2>VANGUARD</h2>
                    <p style={{ color: '#888' }}>Ready for deployment</p>
                    <div className="stat-box" style={{ width: '80%', marginTop: '20px' }}>
                        <div>Level 1</div>
                        <div>XX XP</div>
                    </div>
                </div>

                {/* RIGHT: Stash / Inventory */}
                <div className="glass-card" style={{ flex: 2, display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ margin: '0 0 10px 0', borderBottom: '1px solid #444', paddingBottom: '10px' }}>
                        戰利品倉庫 (STASH)
                    </h3>

                    <div style={{
                        flex: 1, overflowY: 'auto',
                        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                        gap: '10px', alignContent: 'start'
                    }}>
                        {stash.map(item => (
                            <div
                                key={item.id}
                                onClick={() => setSelectedItem(item)}
                                style={{
                                    background: selectedItem?.id === item.id ? '#444' : 'rgba(0,0,0,0.3)',
                                    border: `2px solid ${getRarityColor(item.rarity)}`,
                                    borderRadius: '8px', aspectRatio: '1/1',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', position: 'relative'
                                }}
                            >
                                <div style={{ fontSize: '2rem' }}>
                                    {getIcon(item.type)}
                                </div>
                                {item.type === ItemType.ARTIFACT && (
                                    <div style={{ position: 'absolute', top: 2, right: 2, fontSize: '0.6rem', background: 'red', borderRadius: '50%', width: 10, height: 10 }} />
                                )}
                            </div>
                        ))}
                        {stash.length === 0 && (
                            <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#666', marginTop: '50px' }}>
                                倉庫空空如也... 去戰鬥吧！
                            </div>
                        )}
                    </div>

                    {/* Action Bar for Selected Item */}
                    <div style={{
                        height: '60px', borderTop: '1px solid #444', marginTop: '10px',
                        display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px'
                    }}>
                        {selectedItem ? (
                            <>
                                <div style={{ marginRight: 'auto', color: '#AAA' }}>
                                    {selectedItem.defId} <span style={{ color: getRarityColor(selectedItem.rarity) }}>[{selectedItem.rarity}]</span>
                                </div>

                                {selectedItem.type === ItemType.ARTIFACT && (
                                    <button className="bubble-btn purple" style={{ width: 'auto', padding: '8px 20px', margin: 0 }} onClick={() => handleDecrypt(selectedItem)}>
                                        鑑定 (DECRYPT)
                                    </button>
                                )}

                                <button className="bubble-btn" style={{ width: 'auto', padding: '8px 20px', margin: 0, background: '#555', boxShadow: 'none' }} onClick={() => handleSell(selectedItem)}>
                                    出售 (SELL)
                                </button>
                            </>
                        ) : (
                            <div style={{ color: '#666' }}>選擇一個物品以操作</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Bar: Deploy */}
            <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, height: '80px',
                background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
                <button
                    className="bubble-btn green"
                    style={{ width: '300px', fontSize: '1.5rem', letterSpacing: '2px' }}
                    onClick={handleDeploy}
                >
                    出擊 (DEPLOY)
                </button>
            </div>
        </div>
    );
};

// Helpers
function getRarityColor(r: string) {
    if (r === 'LEGENDARY') return '#FFD700';
    if (r === 'RARE') return '#0088FF';
    if (r === 'UNCOMMON') return '#00FF00';
    return '#888';
}

function getIcon(t: string) {
    if (t === 'WEAPON') return <img src="/assets/icons/weapon_rifle.png" width="48" height="48" alt="Weapon" />;
    if (t === 'ARTIFACT') return <img src="/assets/icons/artifact_box.png" width="48" height="48" alt="Artifact" />;
    return <img src="/assets/icons/material_scrap.png" width="48" height="48" alt="Material" />;
}
