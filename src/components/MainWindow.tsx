import React, { useState, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-dialog';
import { FilePlus, FolderPlus, Settings, Minus } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import SearchBar from './SearchBar';
import FavoriteList from './FavoriteList';
import type { FavoriteItem } from '../types';

interface Props {
  items: FavoriteItem[];
  onAdd: (path: string) => void;
  onRemove: (id: string) => void;
  onUpdate: (item: FavoriteItem) => void;
  onReorder: (items: FavoriteItem[]) => void;
  onOpen: (path: string) => void;
  checkExists: (path: string) => Promise<boolean>;
  onClose: () => void;
  onOpenSettings: () => void;
}

export default function MainWindow({
  items,
  onAdd,
  onRemove,
  onUpdate,
  onReorder,
  onOpen,
  checkExists,
  onClose,
  onOpenSettings,
}: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  React.useEffect(() => {
    const unlisten = listen('tauri://drag-drop', async (event: any) => {
      const paths: string[] = event.payload.paths || [];
      for (const path of paths) {
        try {
          await onAdd(path);
        } catch (e) {
          console.error('Failed to add dropped item:', e);
        }
      }
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, [onAdd]);

  const handleManualAdd = useCallback(async () => {
    const selected = await open({
      multiple: true,
      directory: false,
    });
    if (!selected) return;
    const paths = Array.isArray(selected) ? selected : [selected];
    for (const path of paths) {
      try {
        await onAdd(path);
      } catch (e) {
        console.error('Failed to add item:', e);
      }
    }
  }, [onAdd]);

  const handleAddDir = useCallback(async () => {
    const selected = await open({
      multiple: true,
      directory: true,
    });
    if (!selected) return;
    const paths = Array.isArray(selected) ? selected : [selected];
    for (const path of paths) {
      try {
        await onAdd(path);
      } catch (e) {
        console.error('Failed to add dir:', e);
      }
    }
  }, [onAdd]);

  const handleTogglePin = useCallback(
    (item: FavoriteItem) => {
      onUpdate({ ...item, pinned: !item.pinned });
    },
    [onUpdate]
  );

  const handleRename = useCallback(
    (item: FavoriteItem, newName: string) => {
      onUpdate({ ...item, name: newName });
    },
    [onUpdate]
  );

  const handleTitleBarMouseDown = useCallback(async (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('[data-tauri-drag-region="false"]')) return;
    try {
      await getCurrentWindow().startDragging();
    } catch (err) {
      console.error('Failed to start dragging:', err);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDraggingOver(false);
    },
    []
  );

  const pinnedCount = items.filter((i) => i.pinned).length;

  return (
    <div
      className="flex flex-col h-full bg-bg"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Title bar */}
      <div
        className="flex items-center justify-between px-4 py-2 bg-surface border-b border-border"
        onMouseDown={handleTitleBarMouseDown}
      >
        <div className="flex items-center gap-2" data-tauri-drag-region="false">
          <button
            onClick={() => invoke('quit_app')}
            className="w-3.5 h-3.5 rounded-full bg-danger hover:opacity-80 cursor-pointer"
            title="退出"
          />
          <button
            onClick={onClose}
            className="w-3.5 h-3.5 rounded-full bg-warning hover:opacity-80 cursor-pointer"
            title="最小化到侧边"
          />
          <button
            onClick={onClose}
            className="w-3.5 h-3.5 rounded-full bg-success hover:opacity-80 cursor-pointer"
            title="最小化到侧边"
          />
          <span className="ml-2 text-sm font-semibold text-text">
            常用目录
          </span>
        </div>
        <div className="flex items-center gap-1" data-tauri-drag-region="false">
          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded-lg hover:bg-border transition-colors"
            title="设置"
          >
            <Settings className="w-4 h-4 text-text-secondary" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-border transition-colors"
            title="最小化到侧边"
          >
            <Minus className="w-4 h-4 text-text-secondary" />
          </button>
        </div>
      </div>

      {/* Drag overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-primary/10 border-2 border-dashed border-primary rounded-lg m-2 pointer-events-none">
          <div className="text-primary font-medium text-lg">拖拽到此处添加</div>
        </div>
      )}

      {/* Search bar */}
      <div className="px-4 pt-3 pb-2 app-no-drag">
        <SearchBar value={searchQuery} onChange={setSearchQuery} />
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 pb-2 app-no-drag">
        <button
          onClick={handleManualAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
        >
          <FilePlus className="w-3.5 h-3.5" />
          添加文件
        </button>
        <button
          onClick={handleAddDir}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
        >
          <FolderPlus className="w-3.5 h-3.5" />
          添加目录
        </button>
      </div>

      {/* List */}
      <FavoriteList
        items={items}
        searchQuery={searchQuery}
        onOpen={onOpen}
        onTogglePin={handleTogglePin}
        onDelete={onRemove}
        onRename={handleRename}
        onReorder={onReorder}
        onAdd={handleManualAdd}
        checkExists={checkExists}
      />

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2 text-xs text-text-secondary border-t border-border bg-surface app-no-drag">
        <span>
          共 {items.length} 项
          {pinnedCount > 0 && ` · ${pinnedCount} 项置顶`}
        </span>
        <span>拖拽文件到此处可快速添加</span>
      </div>
    </div>
  );
}
