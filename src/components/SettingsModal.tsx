import { useEffect, useRef } from 'react';
import { X, Upload, Download } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import AnimalIcon from './AnimalIcon';
import type { AppConfig } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  onSave: (config: Partial<AppConfig>) => void;
  onImport?: () => void;
}

const animals: { key: AppConfig['animal']; label: string; desc: string }[] = [
  { key: 'dog', label: '小狗', desc: '忠诚可爱的狗狗' },
  { key: 'cat', label: '小猫', desc: '优雅神秘的小猫' },
  { key: 'rabbit', label: '兔子', desc: '软萌活泼的兔子' },
];

export default function SettingsModal({ isOpen, onClose, config, onSave, onImport }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose]);

  const handleExport = async () => {
    try {
      const path = await save({
        filters: [{ name: 'JSON', extensions: ['json'] }],
        defaultPath: 'favorites-backup.json',
      });
      if (path) {
        await invoke('export_favorites', { path });
      }
    } catch (e) {
      console.error('Export failed:', e);
    }
  };

  const handleImport = async () => {
    try {
      const path = await open({
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });
      if (path && typeof path === 'string') {
        await invoke('import_favorites', { path });
        onImport?.();
      }
    } catch (e) {
      console.error('Import failed:', e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div
        ref={ref}
        className="bg-surface border border-border rounded-2xl shadow-2xl w-96 max-w-[90vw] overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-text">设置</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-border transition-colors"
          >
            <X className="w-4 h-4 text-text-secondary" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          <div>
            <label className="text-sm font-medium text-text mb-3 block">
              选择悬浮图标
            </label>
            <div className="flex flex-col gap-2">
              {animals.map((animal) => (
                <button
                  key={animal.key}
                  onClick={() => onSave({ animal: animal.key })}
                  className={`flex items-center gap-4 px-4 py-3 rounded-xl border-2 transition-all text-left ${
                    config.animal === animal.key
                      ? 'border-primary bg-primary/5'
                      : 'border-transparent hover:bg-border/50'
                  }`}
                >
                  <AnimalIcon animal={animal.key} size={48} />
                  <div>
                    <div className="text-sm font-medium text-text">
                      {animal.label}
                    </div>
                    <div className="text-xs text-text-secondary mt-0.5">
                      {animal.desc}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-text mb-3 block">
              悬浮图标
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-text-secondary">
                最小化后显示悬浮图标
              </span>
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={config.floatWindowEnabled !== false}
                  onChange={(e) =>
                    onSave({ floatWindowEnabled: e.target.checked })
                  }
                />
                <div className="w-11 h-6 bg-border peer-checked:bg-primary rounded-full transition-colors" />
                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
              </div>
            </label>
          </div>

          <div>
            <label className="text-sm font-medium text-text mb-3 block">
              数据管理
            </label>
            <div className="flex gap-3">
              <button
                onClick={handleExport}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border hover:bg-border/50 transition-colors text-sm text-text"
              >
                <Download className="w-4 h-4" />
                导出数据
              </button>
              <button
                onClick={handleImport}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border hover:bg-border/50 transition-colors text-sm text-text"
              >
                <Upload className="w-4 h-4" />
                导入数据
              </button>
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-border bg-bg/50 text-xs text-text-secondary text-center">
          常用目录 v1.0.0
        </div>
      </div>
    </div>
  );
}
