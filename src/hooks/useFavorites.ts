import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { FavoriteItem } from '../types';

export function useFavorites() {
  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await invoke<FavoriteItem[]>('get_favorites');
      setItems(data);
    } catch (e) {
      console.error('Failed to load favorites:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addFavorite = useCallback(async (path: string) => {
    try {
      const item = await invoke<FavoriteItem>('add_favorite', { path });
      setItems(prev => [...prev, item]);
      return item;
    } catch (e) {
      console.error('Failed to add favorite:', e);
      throw e;
    }
  }, []);

  const removeFavorite = useCallback(async (id: string) => {
    try {
      await invoke('remove_favorite', { id });
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (e) {
      console.error('Failed to remove favorite:', e);
      throw e;
    }
  }, []);

  const updateFavorite = useCallback(async (item: FavoriteItem) => {
    try {
      await invoke('update_favorite', { item });
      setItems(prev => prev.map(i => i.id === item.id ? item : i));
    } catch (e) {
      console.error('Failed to update favorite:', e);
      throw e;
    }
  }, []);

  const reorderItems = useCallback(async (newOrder: FavoriteItem[]) => {
    const summary = newOrder.map(i => `{id:${i.id} order:${i.order} pinned:${i.pinned}}`).join(', ');
    invoke('debug_log', { message: `[Reorder] reorderItems received: [${summary}]` });
    setItems(newOrder);
    try {
      await invoke('reorder_favorites', { items: newOrder });
      invoke('debug_log', { message: '[Reorder] backend save OK' });
    } catch (e) {
      invoke('debug_log', { message: `[Reorder] backend FAILED: ${e}` });
    }
  }, []);

  const checkExists = useCallback(async (path: string) => {
    try {
      return await invoke<boolean>('check_exists', { path });
    } catch {
      return false;
    }
  }, []);

  const openPath = useCallback(async (path: string) => {
    try {
      await invoke('open_path', { path });
    } catch (e) {
      console.error('Failed to open path:', e);
      throw e;
    }
  }, []);

  const sortedItems = items.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return a.order - b.order;
  });

  return {
    items: sortedItems,
    loading,
    addFavorite,
    removeFavorite,
    updateFavorite,
    reorderItems,
    checkExists,
    openPath,
    refresh: load,
  };
}
