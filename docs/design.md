# 设计文档

## 架构概览

```
                    +-----------------------+
                    |   tauri.conf.json     |
                    | (应用/构建/插件配置)   |
                    +-----------+-----------+
                                |
                    +-----------v-----------+
                    |   main.rs             |
                    |   - 插件初始化         |
                    |   - 窗口创建           |
                    |   - 系统托盘           |
                    |   - 注册命令           |
                    +---+-------+---+-------+
                        |       |   |
          +-------------+       |   +-------------+
          v                     v                 v
  +-------+--------+   +-------+-------+   +-----+-------+
  | commands.rs    |   | storage.rs    |   | models.rs   |
  | 17 个 Tauri    |   | AppState      |   | 数据类型     |
  | IPC 命令       |   | JSON 读写     |   | FavoriteItem|
  | (CRUD、窗口    |   | Mutex 锁     |   | AppConfig   |
  |  管理、导入导出)|   | 持久化        |   | Position    |
  +----------------+   +---------------+   +-------------+
           |
   Tauri IPC (invoke)
           |
  +--------v--------+
  |   前端           |
  |   (Vite 构建)    |
  +--------+---------+
           |
  +--------+---------+
  |   App.tsx        |
  |   - useFavorites |
  |   - useConfig    |
  |   - MainWindow   |
  |   - SettingsModal|
  +--------+---------+
           |
  +--------+---------+
  | FloatWindow.tsx  |
  | (独立入口，       |
  |  float.html)     |
  +------------------+
```

### 数据流

1. 用户在 React 界面操作，触发 `invoke('command_name', args)`
2. Tauri 路由到 `commands.rs` 中对应的 `#[tauri::command]`
3. 命令读写 `AppState`（`storage.rs`），同步持久化到 JSON 文件
4. 命令返回结果，Tauri 通过 serde 序列化后发回前端
5. React 更新本地状态（通常在后端响应前即乐观更新）

### 持久化模型

- 两个 JSON 文件存储在 Tauri 应用数据目录下：`data.json`（收藏数据）和 `config.json`（设置）
- 每次写操作是同步的，无缓冲：每次修改立即触发 `fs::write`
- 无数据库、无迁移、无版本化 schema

---

## 双窗口架构

应用有两个独立的浏览器入口，均由同一 Vite 项目构建（`vite.config.ts` 中通过 `rollupOptions.input` 配置）：

| 窗口 | 入口 | 尺寸 | 特性 | 定义位置 |
|------|------|------|------|----------|
| 主窗口 | `index.html` → `src/main.tsx` → `App.tsx` | 420×640（最小 360×480） | 无边框、可拖拽 | `tauri.conf.json` |
| 浮动窗口 | `public/float.html` → `src/float.tsx` → `FloatWindow.tsx` | 80×80 | 透明、置顶、无任务栏 | `main.rs` 中编程创建 |

### 主窗口（MainWindow）

- 无边框窗口（`decorations: false`），自定义标题栏拖拽
- 右侧有最小化按钮和设置按钮
- 支持外部文件拖拽添加（通过 `tauri://drag-drop` 事件监听）
- 拖动文件到窗口区域时显示拖拽覆盖层

### 浮动窗口（FloatWindow）

- 始终置顶、透明、跳过任务栏（需要 macOS 私有 API：`macOSPrivateApi: true`）
- 显示所选动物图标（狗/猫/兔子）及绿色状态圆点
- 自定义拖拽逻辑（非 `data-tauri-drag-region`，通过 JS mouse 事件实现）
- 点击 → 恢复主窗口；拖拽 → 移动并保存位置

### 窗口切换

通过 Rust invoke 命令实现：
- `hide_main_show_float` — 隐藏主窗口、显示浮动窗口（受 `float_window_enabled` 配置控制）
- `show_main_hide_float` — 隐藏浮动窗口、恢复主窗口

---

## 系统托盘

在 `main.rs` 的 `setup` 钩子中编程创建（非 `tauri.conf.json` 配置）：

- **左键点击**：显示主窗口（`show_main_hide_float`）
- **右键菜单**：两个选项 — "显示主窗口"和"退出"
- 使用应用默认窗口图标作为托盘图标

---

## 前端-后端通信

前端通过 `@tauri-apps/api/core` 的 `invoke()` 调用 Rust 命令。所有后端命令定义在 `commands.rs`：

### 收藏相关

| 命令 | 用途 | 关键行为 |
|------|------|----------|
| `get_favorites` | 获取所有收藏 | 只读 |
| `add_favorite` | 添加新路径 | 去重（路径重复返回错误）、自动检测文件/目录、生成 UUID |
| `remove_favorite` | 按 ID 删除 | 原地过滤后持久化 |
| `update_favorite` | 替换收藏项 | 按 ID 匹配，全量替换 |
| `reorder_favorites` | 批量排序 | 遍历列表，重新赋值 `order` |
| `check_exists` | 检查路径是否存在 | 纯文件系统检查 |
| `open_path` | 用系统文件管理器打开 | 平台差异：Windows 用 `explorer`，macOS 用 `open`，Linux 用 `xdg-open` |

### 配置相关

| 命令 | 用途 |
|------|------|
| `get_config` | 获取当前配置 |
| `save_config` | 替换配置并持久化 |

### 窗口管理

| 命令 | 用途 |
|------|------|
| `hide_main_show_float` | 隐藏主窗口，显示浮动窗口 |
| `show_main_hide_float` | 隐藏浮动窗口，显示主窗口 |
| `quit_app` | 退出应用 |
| `get_float_position` | 获取浮动窗口位置（考虑 DPI） |
| `set_float_position` | 移动浮动窗口 |
| `save_float_position` | 持久化浮动窗口位置到配置 |

### 数据导入导出

| 命令 | 用途 |
|------|------|
| `export_favorites` | 将收藏数据写入 JSON 文件 |
| `import_favorites` | 从 JSON 文件读取并合并收藏（按路径去重，重新分配 UUID） |

### 调试

| 命令 | 用途 |
|------|------|
| `debug_log` | 追加日志到 `~/favorite-dir-debug.log` |

---

## 状态管理与持久化

### AppState（`storage.rs`）

```rust
pub struct AppState {
    pub favorites: Mutex<Vec<FavoriteItem>>,
    pub config: Mutex<AppConfig>,
}
```

- 通过 `app.manage(state)` 注册为 Tauri 托管状态
- 所有命令通过 `tauri::State<AppState>` 访问
- 修改后主动释放锁再调用 `save_*()` 持久化，避免锁持跨越磁盘 I/O

### 数据模型（`models.rs`）

**FavoriteItem**（与 TypeScript 侧通过 `#[serde(rename_all = "camelCase")]` 对应）：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `String` | UUID v4 |
| `name` | `String` | 显示名称 |
| `path` | `String` | 文件系统路径 |
| `type` | `ItemType` | `File` 或 `Dir`，JSON 中为 `"type"` |
| `pinned` | `bool` | 是否置顶 |
| `order` | `i32` | 排序序号 |
| `created_at` | `i64` | 创建时间（毫秒时间戳） |

**AppConfig**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `animal` | `String` | 动物图标类型，前端约束为 `'dog' \| 'cat' \| 'rabbit'` |
| `float_window_enabled` | `Option<bool>` | 是否启用浮动窗口 |
| `float_pos` | `Option<Position>` | 浮动窗口位置（x, y） |
| `main_window_size` | `Option<WindowSize>` | 保留字段，尚未使用 |

---

## 前端数据流

### useFavorites Hook

封装所有收藏相关的前端-后端通信，提供 React Hook 接口：

```
{
  items: FavoriteItem[],     // 排序后：置顶优先，其次按 order
  loading: boolean,
  addFavorite(path): Promise<FavoriteItem>,
  removeFavorite(id): Promise<void>,
  updateFavorite(item): Promise<void>,
  reorderItems(newOrder): Promise<void>,
  checkExists(path): Promise<boolean>,
  openPath(path): Promise<void>,
  refresh(): Promise<void>,
}
```

- **乐观更新**：每个修改函数在调用后端前立即更新 React 状态
- **客户端排序**：置顶项优先，其次按 `order` 升序

### useConfig Hook

```
{
  config: AppConfig,
  loading: boolean,
  setConfig(partial): Promise<void>,
}
```

- **默认值合并**：从后端获取的配置与 `DEFAULT_CONFIG` 合并，缺失字段自动填充
- **局部更新**：`setConfig` 接受 `Partial<AppConfig>`，仅持久化变更的字段

### App.tsx 根组件

```
App.tsx
  |-- useFavorites()  -->  items, addFavorite, removeFavorite, ...
  |-- useConfig()     -->  config, setConfig
  |
  |-- MainWindow (接收所有 CRUD + 导航回调)
  |     |-- onClose --> invoke('hide_main_show_float')
  |
  |-- SettingsModal (接收 config, onSave, onImport)
        |-- onImport --> 调用 refresh() 重新加载收藏
```

---

## 窗口拖拽

两个窗口均无边框（`decorations: false`），依赖不同的拖拽方式：

### 主窗口标题栏拖拽

- 标题栏 div 设置 `data-tauri-drag-region`
- 标题栏内的交互元素（按钮容器）设置 `data-tauri-drag-region="false"` 以接收点击事件
- CSS 辅助类：`.app-drag-region`（`-webkit-app-region: drag`）和 `.app-no-drag`（`-webkit-app-region: no-drag`）

### 浮动窗口拖拽

- 通过 JS mouse 事件实现自定义拖拽（非 `data-tauri-drag-region`）
- `mousedown` → 获取当前位置 → `mousemove`（`set_float_position`） → `mouseup`
- 拖拽距离 > 3px 判定为拖拽（保存位置），否则判定为点击（恢复主窗口）

---

## 收藏列表拖拽排序

- 使用鼠标事件（mousedown/mousemove/mouseup）实现，而非 HTML5 Drag and Drop API
- 原因：macOS 上 WRY 拦截了 HTML5 DnD 事件
- 拖拽时显示浮动幽灵卡片和插入指示线
- 自动置顶逻辑：将非置顶项拖入置顶区域时自动设为置顶

---

## 收藏列表项布局

每个收藏列表项由以下元素组成，从左到右排列：

```
[拖拽手柄] [类型图标] [名称 + 置顶标识] [路径] [置顶操作] [更多操作]
```

### 元素说明

| 元素 | 可见性 | 功能 |
|------|--------|------|
| 拖拽手柄（GripVertical） | 始终可见 | 鼠标拖拽排序 |
| 类型图标（Folder/FileText） | 始终可见 | 标识目录或文件类型 |
| 名称 | 始终可见 | 收藏项名称，不存在时显示删除线 |
| 置顶标识（Pin） | 始终可见 | 表示该项已被置顶，**只读状态标识** |
| 不存在警告（AlertTriangle） | 始终可见 | 路径不存在时的警告标识 |
| **置顶操作（Pin）** | **悬停显示** | **置顶/取消置顶操作按钮，根据状态切换填充/描边样式** |
| **更多操作（MoreHorizontal）** | **悬停显示** | **打开与鼠标右键相同的操作菜单** |

### 设计说明

- **置顶标识 vs 置顶操作**：名称右侧的小 Pin 图标是置顶状态标识（只读），右侧悬停显示的 Pin 图标是置顶/取消置顶的操作按钮。两者概念不同，分别存在。
- 右侧两个操作按钮默认隐藏（`opacity-0`），鼠标悬停到该记录行时显示（`group-hover:opacity-100`）。
- 更多操作（三个点）打开的菜单与鼠标右键菜单完全相同，包含置顶/取消置顶、重命名、删除三个选项。
- 鼠标右键菜单保留不变，方便习惯右键操作的用户。
- 项目的存在性检查每 30 秒执行一次，不存在的路径显示警告图标和删除线样式。

---

## 搜索

- 通过 `SearchBar` 组件实现实时过滤
- 匹配字段：收藏项名称（`name`）和路径（`path`），大小写不敏感
- 搜索无结果时显示空状态提示

---

## 设置（SettingsModal）

模态对话框，点击主窗口标题栏的设置按钮打开：

1. **浮动图标选择**：三个选项（狗/猫/兔子），用卡片展示 `AnimalIcon` 组件
2. **浮动窗口开关**：自定义复选框控制 `floatWindowEnabled`
3. **数据管理**：两个按钮分别执行导出和导入收藏数据，使用系统文件对话框
4. **关闭方式**：点击外部区域或按 Escape 键关闭
5. **即时保存**：选择选项或切换开关后立即生效，无保存按钮

---

## 主题与样式

基于 Tailwind CSS v4，在 `index.css` 中通过 `@theme` 定义：

| 令牌 | 值 | 用途 |
|------|-----|------|
| `primary` | `#4f46e5` | 按钮、活跃状态、强调色 |
| `primary-hover` | `#4338ca` | 按钮悬停状态 |
| `bg` | `#f8fafc` | 页面背景 |
| `surface` | `#ffffff` | 卡片/模态框表面 |
| `border` | `#e2e8f0` | 分割线、边框 |
| `text` | `#1e293b` | 主要文字 |
| `text-secondary` | `#64748b` | 次要文字 |
| `danger` | `#ef4444` | 危险操作 |
| `warning` | `#f59e0b` | 警告状态 |
| `success` | `#22c55e` | 成功状态 |

- 全局禁用文字选择（`user-select: none`），适合工具类应用
- 自定义 6px 细滚动条

---

## 权限与安全（Capabilities）

在 `src-tauri/capabilities/default.json` 中声明，同时作用于主窗口和浮动窗口：

- `core:default` — 核心 Tauri API
- `core:window:allow-start-dragging` — 允许自定义标题栏拖拽
- `dialog:default` — 文件打开/保存对话框
- `fs:default` — 文件系统访问
- `shell:default` / `shell:allow-open` — Shell 打开能力
- `autostart:default` — 自启动插件

安全说明：`tauri.conf.json` 中 `app.security.csp` 为 `null`（无 CSP 限制），且 `shell.open` 模式为 `"^.*$"`（允许打开任何路径）。

---

## 构建配置

### Vite（`vite.config.ts`）

- 插件：`react()` + `tailwindcss()`（Tailwind v4 Vite 插件）
- 多入口构建：`index.html`（主窗口）+ `float.html`（浮动窗口）
- 开发服务器端口 1420

### Tauri 构建

- `beforeDevCommand`：`npm run dev`
- `beforeBuildCommand`：`npm run build`
- 前端产物目录：`../dist`
- 构建目标：`msi`（Windows）、`dmg`（macOS）、`app`（macOS）
- 自启动配置：`MacosLauncher::LaunchAgent`，参数 `--minimized`
