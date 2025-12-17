import React, { useEffect } from 'react';
import { HapticService } from '../services/HapticService';

interface CyberModalProps {
    title: string;
    message: string;
    isOpen: boolean;
    onClose: () => void;
}

export const CyberModal: React.FC<CyberModalProps> = ({ title, message, isOpen, onClose }) => {
    useEffect(() => {
        if (isOpen) HapticService.light();
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-sm mx-4 bg-[#0e0d16] border border-[#00FFFF] p-6 shadow-[0_0_30px_rgba(0,255,255,0.2)]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Decoration Corners */}
                <div className="absolute top-0 left-0 w-2 h-2 bg-[#00FFFF]" />
                <div className="absolute top-0 right-0 w-2 h-2 bg-[#00FFFF]" />
                <div className="absolute bottom-0 left-0 w-2 h-2 bg-[#00FFFF]" />
                <div className="absolute bottom-0 right-0 w-2 h-2 bg-[#00FFFF]" />

                <h3 className="text-xl font-black text-[#00FFFF] tracking-widest mb-4 border-b border-[#00FFFF]/30 pb-2">
                    {title}
                </h3>

                <div className="text-gray-300 font-mono text-sm leading-relaxed whitespace-pre-line mb-8">
                    {message}
                </div>

                <button
                    className="w-full py-3 bg-[#00FFFF]/10 border border-[#00FFFF] text-[#00FFFF] hover:bg-[#00FFFF]/20 font-bold tracking-widest transition-all active:scale-95"
                    onClick={() => {
                        HapticService.light();
                        onClose();
                    }}
                >
                    ACKNOWLEDGE // 確認
                </button>
            </div>
        </div>
    );
};
