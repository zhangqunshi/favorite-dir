import { useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useConfig } from '../hooks/useConfig';
import AnimalIcon from './AnimalIcon';

export default function FloatWindow() {
  const { config } = useConfig();
  const dragStateRef = useRef<{
    mouseX: number;
    mouseY: number;
    winX: number;
    winY: number;
  } | null>(null);
  const hasDraggedRef = useRef(false);

  const handleMouseDown = useCallback(async (e: React.MouseEvent) => {
    if (e.button !== 0) return;

    const startMouseX = e.screenX;
    const startMouseY = e.screenY;
    hasDraggedRef.current = false;

    try {
      const pos = await invoke<{ x: number; y: number }>('get_float_position');
      dragStateRef.current = {
        mouseX: startMouseX,
        mouseY: startMouseY,
        winX: pos.x,
        winY: pos.y,
      };

      const handleMouseMove = (ev: MouseEvent) => {
        if (!dragStateRef.current) return;

        const dx = ev.screenX - dragStateRef.current.mouseX;
        const dy = ev.screenY - dragStateRef.current.mouseY;

        if (!hasDraggedRef.current && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
          hasDraggedRef.current = true;
        }

        if (hasDraggedRef.current) {
          const newX = dragStateRef.current.winX + dx;
          const newY = dragStateRef.current.winY + dy;
          invoke('set_float_position', { x: newX, y: newY }).catch(console.error);
        }
      };

      const handleMouseUp = async () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);

        const didDrag = hasDraggedRef.current;
        dragStateRef.current = null;

        if (didDrag) {
          await invoke('save_float_position').catch(console.error);
        } else {
          await invoke('show_main_hide_float').catch(console.error);
        }
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } catch (err) {
      console.error('Failed to start drag:', err);
    }
  }, []);

  return (
    <div
      className="w-full h-full flex items-center justify-center select-none"
      onMouseDown={handleMouseDown}
      style={{ backgroundColor: '#ffffff' }}
    >
      <div className="relative">
        <AnimalIcon animal={config.animal} size={64} />
        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-success rounded-full border-2 border-white" />
      </div>
    </div>
  );
}
