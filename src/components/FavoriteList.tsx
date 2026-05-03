import React, { useState, useCallback, useEffect, useRef } from 'react';
import { FolderPlus, Inbox, Folder, FileText, GripVertical } from 'lucide-react';
import FavoriteItemComponent from './FavoriteItem';
import type { FavoriteItem as FavoriteItemType } from '../types';

interface Props {
  items: FavoriteItemType[];
  searchQuery: string;
  onOpen: (path: string) => void;
  onTogglePin: (item: FavoriteItemType) => void;
  onDelete: (id: string) => void;
  onRename: (item: FavoriteItemType, newName: string) => void;
  onReorder: (items: FavoriteItemType[]) => void;
  onAdd: () => void;
  checkExists: (path: string) => Promise<boolean>;
}

export default function FavoriteList({
  items,
  searchQuery,
  onOpen,
  onTogglePin,
  onDelete,
  onRename,
  onReorder,
  onAdd,
  checkExists,
}: Props) {
  const [existsMap, setExistsMap] = useState<Record<string, boolean>>({});
  const [dragState, setDragState] = useState<{
    fromIndex: number;
    targetIndex: number;
    mouseX: number;
    mouseY: number;
  } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const dragMetaRef = useRef<{ fromIndex: number; startY: number } | null>(null);
  const targetIndexRef = useRef(-1);

  useEffect(() => {
    const checkAll = async () => {
      const map: Record<string, boolean> = {};
      for (const item of items) {
        map[item.id] = await checkExists(item.path);
      }
      setExistsMap(map);
    };
    checkAll();

    const interval = setInterval(checkAll, 30000);
    return () => clearInterval(interval);
  }, [items, checkExists]);

  const filtered = items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.path.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // --- Mouse-based drag reorder ---
  const handleGripMouseDown = useCallback((e: React.MouseEvent, fromIndex: number) => {
    if (e.button !== 0) return;
    e.preventDefault();

    dragMetaRef.current = { fromIndex, startY: e.clientY };
    targetIndexRef.current = fromIndex;

    const container = listRef.current;
    const itemEls = container?.querySelectorAll<HTMLElement>('[data-reorder-item]');
    const draggedRect = itemEls?.[fromIndex]?.getBoundingClientRect();
    setDragState({
      fromIndex,
      targetIndex: fromIndex,
      mouseX: e.clientX,
      mouseY: draggedRect ? draggedRect.top : e.clientY,
    });

    const handleMouseMove = (ev: MouseEvent) => {
      if (!dragMetaRef.current) return;
      const els = container?.querySelectorAll<HTMLElement>('[data-reorder-item]');
      if (!els) return;

      // Calculate target index based on cursor Y
      let ti = 0;
      for (let i = 0; i < els.length; i++) {
        const rect = els[i].getBoundingClientRect();
        if (ev.clientY >= rect.top + rect.height / 2) {
          ti = i + 1;
        } else {
          break;
        }
      }
      ti = Math.min(ti, filtered.length - 1);

      targetIndexRef.current = ti;

      setDragState(prev => prev ? {
        ...prev,
        targetIndex: ti,
        mouseX: ev.clientX,
        mouseY: ev.clientY,
      } : null);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      const meta = dragMetaRef.current;
      const currentTarget = targetIndexRef.current;
      dragMetaRef.current = null;
      targetIndexRef.current = -1;
      setDragState(null);

      if (!meta) return;

      const effectiveTarget = currentTarget > meta.fromIndex ? currentTarget - 1 : currentTarget;
      if (effectiveTarget === meta.fromIndex) return;

      const newItems = filtered.map(item => ({ ...item }));
      const [removed] = newItems.splice(meta.fromIndex, 1);
      const pinnedCount = newItems.filter(i => i.pinned).length;

      const itemToInsert = effectiveTarget < pinnedCount && !removed.pinned
        ? { ...removed, pinned: true }
        : removed;
      newItems.splice(effectiveTarget, 0, itemToInsert);

      const reordered = newItems.map((item, i) => ({
        ...item,
        order: i,
      }));
      onReorder(reordered);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [filtered, onReorder]);

  const draggedItem = dragState ? filtered[dragState.fromIndex] : null;

  return (
    <div
      ref={listRef}
      className="flex-1 overflow-y-auto px-4 pb-4"
    >
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-text-secondary">
          <Inbox className="w-12 h-12 mb-3 opacity-40" />
          <p className="text-sm">
            {searchQuery ? '没有匹配的目录或文件' : '还没有收藏的目录或文件'}
          </p>
          {!searchQuery && (
            <button
              onClick={onAdd}
              className="mt-3 flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary bg-primary/5 rounded-lg hover:bg-primary/10 transition-colors"
            >
              <FolderPlus className="w-4 h-4" />
              添加一个
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {filtered.map((item, index) => {
            const isDragged = dragState && index === dragState.fromIndex;
            // Skip the dragged item at its original position
            if (isDragged) return null;

            // Calculate effective index (position in the list excluding the dragged item)
            const adjustedIndex = dragState && index > dragState.fromIndex ? index - 1 : index;
            const showIndicator = dragState !== null && adjustedIndex === dragState.targetIndex;

            return (
              <div key={item.id} data-reorder-item>
                {showIndicator && (
                  <div className="h-0.5 bg-primary rounded-full my-0.5" />
                )}
                <FavoriteItemComponent
                  item={item}
                  exists={existsMap[item.id] ?? true}
                  onOpen={onOpen}
                  onTogglePin={onTogglePin}
                  onDelete={onDelete}
                  onRename={onRename}
                  onGripMouseDown={(e) => handleGripMouseDown(e, index)}
                />
              </div>
            );
          })}

          {/* Drop indicator at the very end */}
          {dragState && dragState.targetIndex >= filtered.length - 1 && (
            <div className="h-0.5 bg-primary rounded-full my-0.5" />
          )}
        </div>
      )}

      {/* Floating ghost card */}
      {dragState && draggedItem && (
        <div
          className="fixed pointer-events-none z-50"
          style={{
            left: dragState.mouseX - 20,
            top: dragState.mouseY,
            transform: 'translateY(-50%)',
          }}
        >
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-surface border-2 border-primary shadow-xl opacity-95 min-w-[200px]">
            <GripVertical className="w-4 h-4 text-primary" />
            {draggedItem.type === 'dir' ? (
              <Folder className="w-5 h-5 shrink-0 text-primary" />
            ) : (
              <FileText className="w-5 h-5 shrink-0 text-primary" />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-text truncate">
                {draggedItem.name}
              </div>
              <div className="text-xs text-text-secondary truncate">
                {draggedItem.path}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
