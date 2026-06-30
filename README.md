# ChatGPT Quick Navigator

一个面向 Edge / Chrome 的轻量浏览器扩展，为 ChatGPT 长对话自动生成提问目录。

## 功能

- 自动提取当前对话中的用户提问
- 点击目录项目平滑跳转
- 根据阅读位置高亮当前问题
- 搜索本次对话中的问题
- `Alt + ↑` / `Alt + ↓` 跳到上一问或下一问
- 对话新增后自动更新目录
- 支持收起目录，并记住收起状态
- 自动适配浅色和深色页面

所有处理都在浏览器本地完成，不会上传聊天内容。

## 在 Edge 中安装

1. 打开 `edge://extensions/`。
2. 开启左侧的“开发人员模式”。
3. 点击“加载解压缩的扩展”。
4. 选择本项目文件夹。
5. 打开或刷新 [ChatGPT](https://chatgpt.com/)。

## 开发检查

本项目没有第三方运行时依赖。

```bash
npm run check
npm test
```

## 已知限制

扩展依赖 ChatGPT 网页中的消息角色标记。如果 ChatGPT 大幅调整页面结构，可能需要同步更新消息选择规则。

## License

[MIT](LICENSE)
