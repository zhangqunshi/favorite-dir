# 常用目录管理器

一个轻量级的桌面工具，用于快速访问和管理本地常用的目录与文件。通过可拖拽的浮动图标 + 主窗口的形式，常驻桌面边缘，一键打开常用路径。

![应用截图](./app-icon.png)

## 功能

- **收藏管理** — 添加、删除、重命名本地目录和文件
- **快速启动** — 点击即可用系统默认程序打开目标路径
- **置顶排序** — 重要项目可置顶，支持拖拽排序
- **实时搜索** — 按名称或路径关键词快速过滤
- **拖拽添加** — 从文件资源管理器拖拽文件/目录到窗口即可收藏
- **浮动图标** — 可拖动的桌面边缘小图标，点击唤出主窗口
- **系统托盘** — 左键/右键点击托盘图标快速操作
- **开机自启** — 支持设置开机自动运行
- **完全离线** — 所有数据存储在本地，无需网络

## 技术栈

- **后端**: Rust + Tauri 2.0
- **前端**: React 19 + TypeScript (严格模式)
- **样式**: Tailwind CSS v4
- **图标**: Lucide React

## 开发

### 前置要求

- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://rustup.rs/) (v1.85+)
- Windows 或 macOS

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run tauri dev
```

这会同时启动 Vite 前端开发服务器和 Tauri 桌面应用。

### 构建生产版本

```bash
npm run tauri build
```

> **注意**：如果遇到 `cargo: command not found` 错误，说明 Rust 工具链未在 PATH 中，请运行：
> ```bash
> export PATH="$HOME/.cargo/bin:$PATH" && npm run tauri build
> ```
> 或将其加入 shell 配置文件（`~/.zshrc` / `~/.bashrc`）永久生效：
> ```bash
> echo 'export PATH="$HOME/.cargo/bin:$PATH"' >> ~/.zshrc
> ```

构建完成后，可执行文件位于：
- **macOS**: `src-tauri/target/release/bundle/dmg/常用目录_1.0.0_aarch64.dmg` 和 `src-tauri/target/release/bundle/macos/常用目录.app`
- **Windows**: `src-tauri/target/release/favorite-dir.exe`

## 项目结构

```
.
├── src/                        # 前端源码
│   ├── components/             # React 组件
│   │   ├── MainWindow.tsx      # 主窗口界面
│   │   ├── FloatWindow.tsx     # 浮动图标窗口
│   │   ├── FavoriteList.tsx    # 收藏列表（含拖拽排序）
│   │   ├── FavoriteItem.tsx    # 单个收藏项
│   │   ├── SearchBar.tsx       # 搜索栏
│   │   ├── SettingsModal.tsx   # 设置弹窗
│   │   └── AnimalIcon.tsx      # 动物 SVG 图标
│   ├── hooks/
│   │   ├── useFavorites.ts     # 收藏数据管理
│   │   └── useConfig.ts        # 配置管理
│   ├── types/
│   │   └── index.ts            # TypeScript 类型定义
│   ├── main.tsx                # 主窗口入口
│   └── float.tsx               # 浮动窗口入口
├── src-tauri/
│   ├── src/
│   │   ├── main.rs             # 应用入口（窗口/托盘创建）
│   │   ├── commands.rs         # 前端可调用的 Rust 命令
│   │   ├── storage.rs          # 数据持久化（JSON）
│   │   └── models.rs           # 数据结构定义
│   ├── Cargo.toml
│   └── tauri.conf.json         # Tauri 配置
├── index.html                  # 主窗口 HTML
├── public/float.html           # 浮动窗口 HTML
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## 架构说明

### 双窗口设计

应用包含两个独立的浏览器入口，由同一份 Vite 构建：

| 窗口 | 尺寸 | 入口文件 | 说明 |
|------|------|----------|------|
| 主窗口 | 420×640 | `index.html` → `src/main.tsx` | 列表、搜索、管理功能 |
| 浮动窗口 | 80×80 | `public/float.html` → `src/float.tsx` | 透明、置顶、可拖拽的动物图标 |

浮动窗口在 Rust 代码中通过 `create_float_window` 函数**动态创建**，不定义在 `tauri.conf.json` 中，避免标签冲突。

### 窗口切换

- **主窗口 → 浮动窗口**: 点击左上角黄色按钮或右上角"最小化到侧边"按钮，调用 `hide_main_show_float`
- **浮动窗口 → 主窗口**: 点击浮动图标，调用 `show_main_hide_float`
- **系统托盘**: 左键点击托盘图标或选择菜单"显示主窗口"

### 数据持久化

数据以 JSON 格式保存在 Tauri 应用数据目录：

- `data.json` — 收藏列表（含排序、置顶状态）
- `config.json` — 应用设置（动物图标选择、浮动窗口位置）

### 拖拽实现

- **窗口拖拽**: 通过 `data-tauri-drag-region` HTML 属性实现（Tauri 原生支持）
- **列表排序**: HTML5 Drag and Drop API，支持收藏项之间的拖拽重排
- **外部文件拖拽**: 监听 `tauri://drag-drop` 事件，拖拽文件到窗口即可添加收藏

### 权限

Tauri 能力声明在 `src-tauri/capabilities/default.json` 中，包括文件系统访问、对话框、Shell 打开、自启动等。

## 已知问题

- **MSI 打包**: Windows 上 MSI 安装包构建需要 Wix 工具链，如遇失败可直接使用 `.exe` 文件
- **macOS bundle ID**: 当前 identifier `com.favorite-dir.app` 以 `.app` 结尾，与 macOS bundle 扩展名冲突，后续版本会调整

## License

MIT
