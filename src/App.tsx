import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import MainWindow from './components/MainWindow';
import SettingsModal from './components/SettingsModal';
import { useFavorites } from './hooks/useFavorites';
import { useConfig } from './hooks/useConfig';

export default function App() {
  const [showSettings, setShowSettings] = useState(false);
  const { items, addFavorite, removeFavorite, updateFavorite, reorderItems, openPath, checkExists } = useFavorites();
  const { config, setConfig } = useConfig();

  const handleClose = useCallback(async () => {
    try {
      await invoke('hide_main_show_float');
    } catch (e) {
      console.error('Failed to switch window:', e);
    }
  }, []);

  return (
    <div className="h-full w-full flex flex-col">
      <MainWindow
        items={items}
        onAdd={addFavorite}
        onRemove={removeFavorite}
        onUpdate={updateFavorite}
        onReorder={reorderItems}
        onOpen={openPath}
        checkExists={checkExists}
        onClose={handleClose}
        onOpenSettings={() => setShowSettings(true)}
      />
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        config={config}
        onSave={setConfig}
      />
    </div>
  );
}
