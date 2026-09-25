import React, { useRef } from 'react';
import { GameState } from '../types';
import { exportSave, loadGame, saveGame } from '../services/gameService';

interface Props {
    state: GameState;
    updateState: (s: Partial<GameState>) => void;
}

const Library: React.FC<Props> = ({ state, updateState }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                if (json.gold !== undefined && json.roster) {
                    if (confirm("确定要覆盖当前存档吗？此操作不可逆。")) {
                        saveGame(json);
                        window.location.reload();
                    }
                } else {
                    alert("存档格式错误");
                }
            } catch (err) {
                alert("文件解析失败");
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="absolute inset-0 p-8 overflow-y-auto text-main bg-core/40">
            <h2 className="text-2xl font-serif text-primary mb-6 border-b border-glass pb-2 neon-text">皇家图书馆</h2>

            <div className="mb-8 p-6 glass-panel rounded-2xl shadow-sm">
                <h3 className="text-sm font-bold opacity-60 mb-4 uppercase tracking-widest text-dim">Data Archives</h3>
                <div className="flex gap-4">
                    <button 
                        onClick={() => exportSave(state, `EightGrass_Save_${new Date().toISOString().slice(0,10)}`)}
                        className="flex-1 glass-panel hover:bg-white/5 border border-glass py-3 rounded-xl text-primary text-sm font-bold hover:shadow-lg transition-all"
                    >
                        导出存档 (JSON)
                    </button>
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 glass-panel hover:bg-white/5 border border-glass py-3 rounded-xl text-dim text-sm font-bold hover:shadow-lg transition-all"
                    >
                        导入存档
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".json" />
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