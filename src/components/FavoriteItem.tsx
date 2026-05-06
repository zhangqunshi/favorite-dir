import React, { useState, useCallback } from 'react';
import { Folder, FileText, Pin, GripVertical, Trash2, AlertTriangle, Pencil, MoreHorizontal } from 'lucide-react';
import type { FavoriteItem as FavoriteItemType } from '../types';

/** 计算菜单位置，确保不超出窗口边界 */
function fitMenuPos(x: number, y: number) {
  const MENU_WIDTH = 148;  // min-w-[140px] + padding + border
  const MENU_HEIGHT = 120; // approx: 3 items ~32px + divider + padding
  const MARGIN = 8;

  const maxX = window.innerWidth - MENU_WIDTH - MARGIN;
  const maxY = window.innerHeight - MENU_HEIGHT - MARGIN;

  return {
    x: x > maxX ? maxX : x,
    y: y > maxY ? y - MENU_HEIGHT - MARGIN : y,
  };
}

interface Props {
  item: FavoriteItemType;
  exists: boolean;
  onOpen: (path: string) => void;
  onTogglePin: (item: FavoriteItemType) => void;
  onDelete: (id: string) => void;
  onRename: (item: FavoriteItemType, newName: string) => void;
  onGripMouseDown: (e: React.MouseEvent) => void;
}

export default function FavoriteItemComponent({
  item,
  exists,
  onOpen,
  onTogglePin,
  onDelete,
  onRename,
  onGripMouseDown,
}: Props) {
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(item.name);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    // Close all other context menus first
    document.dispatchEvent(new CustomEvent('close-context-menu'));
    setMenuPos(fitMenuPos(e.clientX, e.clientY));
    setShowMenu(true);
  }, []);


  const handleMenuButtonClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    document.dispatchEvent(new CustomEvent('close-context-menu'));
    setMenuPos(fitMenuPos(rect.left, rect.bottom));
    setShowMenu(true);
  }, []);

  const handlePinClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onTogglePin(item);
  }, [item, onTogglePin]);

  const handleRename = useCallback(() => {
    if (editName.trim() && editName !== item.name) {
      onRename(item, editName.trim());
    }
    setIsEditing(false);
  }, [editName, item, onRename]);

  React.useEffect(() => {
    if (showMenu) {
      const close = () => setShowMenu(false);
      document.addEventListener('click', close);
      document.addEventListener('close-context-menu', close);
      return () => {
        document.removeEventListener('click', close);
        document.removeEventListener('close-context-menu', close);
      };
    }
  }, [showMenu]);

  return (
    <>
      <div
        onContextMenu={handleContextMenu}
        className={`group flex items-center gap-1.5 px-3 py-2.5 rounded-lg cursor-pointer transition-all hover:bg-primary/5 border border-transparent hover:border-primary/10 ${
          !exists ? 'opacity-70' : ''
        }`}
      >
        <div
          className="cursor-grab active:cursor-grabbing self-stretch flex items-center px-1.5 -ml-1.5 rounded-lg hover:bg-primary/5 transition-colors"
          onMouseDown={onGripMouseDown}
        >
          <GripVertical className="w-6 h-6 text-text-secondary/40 shrink-0" />
        </div>

        <div
          className="flex-1 min-w-0 flex items-center gap-2"
          onClick={() => exists && onOpen(item.path)}
        >
          {item.type === 'dir' ? (
            <Folder className={`w-5 h-5 shrink-0 ${exists ? 'text-primary' : 'text-text-secondary'}`} />
          ) : (
            <FileText className={`w-5 h-5 shrink-0 ${exists ? 'text-primary' : 'text-text-secondary'}`} />
          )}
          <div className="min-w-0 flex-1">
          {isEditing ? (
            <input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') {
                  setEditName(item.name);
                  setIsEditing(false);
                }
              }}
              className="w-full px-1.5 py-0.5 text-sm bg-surface border border-primary rounded focus:outline-none"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div className="flex items-center gap-1.5">
              <span className={`text-sm font-medium truncate ${exists ? 'text-text' : 'text-text-secondary line-through'}`}>
                {item.name}
              </span>
              {item.pinned && <Pin className="w-3 h-3 text-warning fill-warning shrink-0" />}
              {!exists && <AlertTriangle className="w-3.5 h-3.5 text-danger shrink-0" />}
            </div>
          )}
          <div className="text-xs text-text-secondary truncate mt-0.5">{item.path}</div>
        </div>
      </div>

      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handlePinClick}
          className="p-1 rounded-lg hover:bg-primary/10 transition-colors"
          title={item.pinned ? '取消置顶' : '置顶'}
        >
          <Pin className={`w-4 h-4 ${item.pinned ? 'text-warning fill-warning' : 'text-text-secondary'}`} />
        </button>
        <button
          onClick={handleMenuButtonClick}
          className="p-1 rounded-lg hover:bg-primary/10 transition-colors"
          title="更多操作"
        >
          <MoreHorizontal className="w-4 h-4 text-text-secondary" />
        </button>
      </div>
    </div>

    {showMenu && (
        <div
          className="fixed z-50 bg-surface border border-border rounded-lg shadow-lg py-1 min-w-[140px]"
          style={{ left: menuPos.x, top: menuPos.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              onTogglePin(item);
              setShowMenu(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text hover:bg-primary/5 transition-colors"
          >
            <Pin className={`w-4 h-4 ${item.pinned ? 'text-warning' : ''}`} />
            {item.pinned ? '取消置顶' : '置顶'}
          </button>
          <button
            onClick={() => {
              setIsEditing(true);
              setShowMenu(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text hover:bg-primary/5 transition-colors"
          >
            <Pencil className="w-4 h-4" />
            重命名
          </button>
          <div className="h-px bg-border mx-2 my-1" />
          <button
            onClick={() => {
              onDelete(item.id);
              setShowMenu(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-danger/5 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            删除
          </button>
        </div>
      )}
    </>
  );
}
