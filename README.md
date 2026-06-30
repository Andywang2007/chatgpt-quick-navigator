# ChatGPT Quick Navigator

一个面向 Microsoft Edge 和 Google Chrome 的轻量浏览器扩展，为 ChatGPT 长对话生成可搜索、可跳转的提问目录。

扩展不需要 OpenAI API，也没有后端服务。聊天内容只在当前浏览器页面中处理，不会上传到其他服务器。

## 功能

- 自动提取当前对话中的用户提问
- 点击目录项目平滑跳转到对应位置
- 根据阅读位置高亮当前问题
- 搜索本次对话中的问题
- `Alt + ↑` / `Alt + ↓` 跳到上一问或下一问
- GPT 继续生成内容时自动更新目录
- 缓存已发现的问题，避免旧消息懒加载时目录数量跳变
- 点击暂时未加载的问题时，自动滚动寻找对应消息
- 支持收起目录，并记住收起状态
- 自动适配 ChatGPT 的浅色和深色页面

## 安装说明

### 1. 获取代码

在 GitHub 项目页面点击 **Code → Download ZIP**，下载后解压。也可以使用 Git：

```bash
git clone https://github.com/Andywang2007/chatgpt-quick-navigator.git
```

最终需要选择的是包含 `manifest.json` 的 `chatgpt-quick-navigator` 文件夹，不要只选择 `src` 文件夹。

### 2. 在 Edge 中加载

1. 在地址栏打开 `edge://extensions/`。
2. 开启“开发人员模式”。
3. 点击“加载解压缩的扩展”。
4. 选择包含 `manifest.json` 的项目文件夹。
5. 打开或刷新 [ChatGPT](https://chatgpt.com/)。

### 3. 在 Chrome 中加载

1. 在地址栏打开 `chrome://extensions/`。
2. 开启右上角的“开发者模式”。
3. 点击“加载已解压的扩展程序”。
4. 选择包含 `manifest.json` 的项目文件夹。
5. 打开或刷新 [ChatGPT](https://chatgpt.com/)。

## 使用说明

打开一条 ChatGPT 对话后，页面右侧会出现“对话目录”。

- **定位问题：** 点击目录中的问题标题。
- **搜索问题：** 在顶部搜索框输入关键词，只筛选当前对话。
- **连续浏览：** 点击“上一问”“下一问”，或者使用键盘快捷键。
- **收起目录：** 点击右上角的 `×`；收起后点击页面右侧的菜单按钮可以重新展开。
- **旧消息：** 灰色目录项表示对应消息暂时被 ChatGPT 卸载。点击后扩展会尝试自动滚动并重新加载它。

| 操作 | 快捷键 |
| --- | --- |
| 跳到上一问 | `Alt + ↑` |
| 跳到下一问 | `Alt + ↓` |
| 展开或收起目录 | `Alt + Shift + O` |

在输入框或 ChatGPT 编辑区域中打字时，扩展不会拦截这些快捷键。

## 更新扩展

如果使用 Git 安装：

```bash
git pull
```

如果使用 ZIP 安装，请重新下载并覆盖旧项目文件。更新文件后：

1. 打开浏览器的扩展管理页面。
2. 找到 **ChatGPT Quick Navigator**。
3. 点击“重新加载”按钮。
4. 刷新已经打开的 ChatGPT 页面。

## 项目如何实现

扩展采用 Manifest V3，不使用框架和第三方运行时依赖。

```text
manifest.json
  └─ 在 ChatGPT 页面加载脚本和样式
      ├─ src/helpers.js   文本处理、当前位置计算、目录缓存合并
      ├─ src/content.js   扫描消息、渲染目录、搜索和跳转
      └─ src/content.css  目录界面、深浅色主题

test/helpers.test.js      核心逻辑回归测试
```

核心流程如下：

1. 使用 `[data-message-author-role="user"]` 找到用户消息。
2. 优先使用消息 ID 或 `conversation-turn-*` 作为稳定标识。
3. 将提问标题保存到当前对话的内存缓存中。
4. 使用 `MutationObserver` 监听新增消息和页面更新。
5. 页面滚动时计算当前所在问题，并同步高亮目录项。
6. 如果目标消息已被懒加载卸载，扩展会向相应方向滚动，等待节点重新出现后再定位。

ChatGPT 是单页应用，因此扩展也会根据当前页面路径区分不同对话，避免把多个对话的目录混在一起。

## 本地开发

本项目没有需要安装的 npm 依赖。修改代码后运行：

```bash
npm run check
npm test
```

然后在扩展管理页面重新加载扩展，并刷新 ChatGPT。建议至少手动检查：

- 新对话和长对话都能显示目录
- 点击问题后跳转位置正确
- 搜索能够筛选目录
- 上一问、下一问和快捷键有效
- 切换 ChatGPT 深浅色主题后界面可读
- 上下滚动长对话时，目录数量不会因为懒加载而减少
- 切换到另一条对话时，不会保留上一条对话的目录

## 修改和扩展功能

- 修改消息识别规则：编辑 `src/content.js` 中的 `USER_MESSAGE_SELECTOR`。
- 修改目录宽度、颜色或位置：编辑 `src/content.css` 中以 `#cqn-root` 开头的样式。
- 修改标题长度：调整 `src/content.js` 中调用 `shortenTitle` 时的长度参数。
- 新增纯逻辑功能：优先放入 `src/helpers.js`，并在 `test/helpers.test.js` 中增加测试。

修改 `manifest.json` 后必须在扩展管理页面重新加载；只刷新 ChatGPT 页面通常不够。

## 权限和隐私

扩展仅在以下页面运行：

- `https://chatgpt.com/*`
- `https://chat.openai.com/*`

`storage` 权限只用于记住目录的展开或收起状态。项目没有网络请求、统计 SDK、广告代码或聊天内容上传逻辑。

## 常见问题

### 安装后没有看到目录

确认扩展已启用，选择的目录中存在 `manifest.json`，然后在扩展管理页面重新加载扩展，并刷新 ChatGPT。

### 目录中的问题数量偶尔变化

请确认扩展版本不低于 `0.1.1`。ChatGPT 会懒加载长对话中的消息，新版扩展会缓存已经发现的问题。首次打开特别长的旧对话时，仍可能需要向上滚动一次，让 ChatGPT 加载更早的内容。

### 点击旧问题后没有立即跳转

扩展会先尝试滚动并等待 ChatGPT 重新加载消息。如果页面没有加载成功，会显示提示；此时先手动向上滚动，再点击对应目录项。

### ChatGPT 更新后目录完全失效

ChatGPT 的内部网页结构不是公开稳定接口。如果消息角色标记发生变化，需要检查页面结构并更新 `USER_MESSAGE_SELECTOR`，随后补充回归测试。

## License

[MIT](LICENSE)
