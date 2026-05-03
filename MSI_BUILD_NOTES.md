# MSI 构建踩坑记录

## 问题 1: 中文字符导致 WiX light.exe 编码错误

### 现象
运行 `npm run tauri build -- --bundles msi` 时，前端和 Rust 编译均成功，但 WiX 打包阶段失败：

```
error LGHT0311 : A string was provided with characters that are not available in
 the specified database code page '1252'.
```

### 根因
`tauri.conf.json` 中 `productName` 为 `"常用目录"`（中文）。
WiX 默认使用 `en-US` locale，对应 code page 1252（西欧字符集），无法编码中文字符。

### 解决
在 `tauri.conf.json` 的 `bundle.windows` 下增加 WiX 中文 locale 配置：

```json
"windows": {
  "webviewInstallMode": {
    "type": "downloadBootstrapper"
  },
  "wix": {
    "language": "zh-CN"
  }
}
```

指定 `"zh-CN"` 后，WiX 使用 GBK code page，中文可以正常编码。

---

## 问题 2: Windows 目录被占用 (os error 32)

### 现象
修复编码后，构建仍报错：

```
failed to bundle project `另一个程序正在使用此文件，进程无法访问。 (os error 32)`
```

### 根因
排查过程中，曾手动进入 `src-tauri/target/release/wix/x64` 目录运行 `light.exe` 测试，导致 bash shell 的工作目录（CWD）长期停留在该目录下。

Tauri 每次构建 MSI 时会清理并重建 `wix/` 临时目录，但 Windows 不允许删除/替换**当前进程的工作目录**，因此报 sharing violation。

### 解决
将 shell 工作目录切回项目根目录，并手动清理残留的 `target/release/wix` 目录后重试，构建通过。

---

## 成功生成的文件

```
src-tauri/target/release/bundle/msi/常用目录_1.0.0_x64_zh-CN.msi
```

大小约 4.4 MB，已内嵌 WebView2 引导器，可在缺少 WebView2 的 Windows 机器上安装时自动下载安装。
