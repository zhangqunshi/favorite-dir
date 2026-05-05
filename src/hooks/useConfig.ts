import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { AppConfig } from '../types';

const DEFAULT_CONFIG: AppConfig = {
  animal: 'dog',
  floatWindowEnabled: true,
};

export function useConfig() {
  const [config, setConfigState] = useState<AppConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await invoke<AppConfig>('get_config');
      setConfigState({ ...DEFAULT_CONFIG, ...data });
    } catch (e) {
      console.error('Failed to load config:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setConfig = useCallback(async (partial: Partial<AppConfig>) => {
    const next = { ...config, ...partial };
    setConfigState(next);
    try {
      await invoke('save_config', { config: next });
    } catch (e) {
      console.error('Failed to save config:', e);
    }
  }, [config]);

  return { config, loading, setConfig };
}
