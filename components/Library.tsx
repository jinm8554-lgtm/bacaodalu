import React from 'react';
import { GameState } from '../types';

interface Props {
    state: GameState;
    updateState: (s: Partial<GameState>) => void;
}

const Library: React.FC<Props> = ({ state, updateState }) => {

    return (
        <div className="absolute inset-0 p-8 overflow-y-auto text-main bg-core/40">
            <h2 className="text-2xl font-serif text-primary mb-6 border-b border-glass pb-2 neon-text">皇家图书馆</h2>

            <div className="mb-8 p-6 glass-panel rounded-2xl shadow-sm">
                <h3 className="text-sm font-bold opacity-60 mb-4 uppercase tracking-widest text-dim">Data Archives</h3>
                <div className="flex gap-4">
                    <div className="flex-1 glass-panel border border-glass py-3 rounded-xl text-primary text-sm font-bold text-center">云端自动保存</div>
                    <div className="flex-1 glass-panel border border-glass py-3 rounded-xl text-dim text-sm font-bold text-center">会员档案同步</div>
                </div>
            </div>

            <div className="mb-8">
                <h3 className="text-lg text-main mb-4">大陆编年史</h3>
                <div className="space-y-4">
                    <div className="border-l-2 border-primary pl-4 py-1">
                        <div className="text-xs text-dim">纪元 1024 年</div>
                        <div className="text-sm opacity-90">魔王降临卡拉多恩，八草圣殿建立。</div>
                    </div>
                    {state.nations.filter(n => n.progress > 0).map(n => (
                        <div key={n.id} className="border-l-2 border-primary pl-4 py-1">
                             <div className="text-xs text-dim">最近</div>
                             <div className="text-sm opacity-90">征服 {n.name} 的脚步已经开始 (进度: {n.progress}%)。</div>
                        </div>
                    ))}
                </div>
            </div>

            <div>
                <h3 className="text-lg text-main mb-4">契约密录</h3>
                <div className="grid gap-2">
                    {state.roster.filter(c => c.isOwned).map(c => (
                        <div key={c.id} className="glass-panel p-3 rounded-xl flex justify-between items-center border border-glass hover:border-primary transition-colors">
                            <span className="text-primary font-bold">{c.name}</span>
                            <span className="text-xs text-dim">羁绊等级: {Math.floor(c.bond / 10)}</span>
                        </div>
                    ))}
                    {state.roster.length === 1 && <div className="text-sm italic opacity-60 text-dim">暂无更多契约记录...</div>}
                </div>
            </div>
        </div>
    );
};

export default Library;
