export interface FavoriteItem {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'dir';
  pinned: boolean;
  order: number;
  createdAt: number;
}

export interface AppConfig {
  animal: 'dog' | 'cat' | 'rabbit';
  floatWindowEnabled?: boolean;
  floatPos?: { x: number; y: number };
  mainWindowSize?: { width: number; height: number };
}
