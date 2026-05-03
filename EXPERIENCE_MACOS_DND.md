# macOS Tauri v2 Drag-and-Drop 问题与解决方案

## 问题

在 macOS 上，Tauri v2 应用的 HTML5 Drag and Drop API（`draggable`, `onDragOver`, `onDrop` 等事件）**完全无法工作**。具体表现为：
- `dragStart` 和 `dragEnd` 事件可以触发
- `dragOver` 和 `drop` 事件**从不触发**（即使使用原生 `addEventListener` 监听）
- 仅在 macOS 上出现此问题，Windows 不受影响

## 根因

Tauri v2 在 macOS 上使用 WRY (WebKit WKWebView) 实现 webview。WKWebView 的 HTML5 DnD 底层使用 Cocoa 的 `NSDragging` 原生协议。WRY 在 `wry-0.55.0/src/wkwebview/drag_drop.rs` 中实现了 `draggingEntered`/`draggingUpdated`/`performDragOperation`/`draggingExited` 方法。

关键代码（`tauri-runtime-wry`）：

```rust
if webview_attributes.drag_drop_handler_enabled {
    webview_builder = webview_builder.with_drag_drop_handler(move |event| {
        let _ = proxy.send_event(...);
        true  // ← 始终返回 true，阻止调用 super
    });
}
```

当 handler 返回 `true` 时，WRY 的 `draggingUpdated` 不调用 `super`（即 WKWebView 的默认实现），导致 JavaScript 层的 `dragover`/`drop` 事件**永远不被分派**。

无论 `dragDropEnabled` 是 `true` 还是 `false`，只要 Tauri 的 drag-drop handler 被注册，HTML5 DnD 事件就被阻断。

## 解决方案

**完全放弃 HTML5 DnD API，改用鼠标事件（mousedown/mousemove/mouseup）实现拖拽排序。**

### 实现要点

1. **拖拽发起**：在拖拽手柄（`GripVertical` 图标）上绑定 `onMouseDown`，记录起始索引和鼠标 Y 坐标
2. **位置计算**：在 `mousemove` 中遍历 `[data-reorder-item]` 元素的 `getBoundingClientRect()`，根据鼠标 Y 坐标与元素中点的比较确定目标插入位置
3. **视觉反馈**：
   - 被拖拽项从列表中原位消失（不渲染）
   - 用一个 `fixed` 定位的浮动卡片跟随鼠标，带高亮边框和阴影
   - 列表其他项自动移位，在目标插入位置显示蓝色指示线
4. **提交排序**：在 `mouseup` 中执行实际的数组重排并调用 `onReorder`

### 关键代码结构

```tsx
// 状态
const [dragState, setDragState] = useState<{...} | null>(null);

// 用 ref 同步追踪目标索引（解决闭包中状态异步更新的问题）
const targetIndexRef = useRef(-1);

// 事件监听在 mousedown 时动态添加和移除
const handleGripMouseDown = (e, fromIndex) => {
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
};
```

### 要点
- 使用 `useRef` 而非 `useState` 追踪 `targetIndex`，因为 mousemove 回调需要同步读取最新值
- 浮动卡片用 `fixed` 定位 + `pointer-events-none`，随 `mousemove` 更新坐标
- `dragDropEnabled: true` 可以保留（不影响鼠标事件方案）
- 此方案在 macOS 和 Windows 上均正常工作

## 相关文件
- `src/components/FavoriteList.tsx` — 拖拽排序实现
- `src/components/FavoriteItem.tsx` — 拖拽手柄绑定
