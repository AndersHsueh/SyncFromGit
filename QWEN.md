# SyncFromGit (吉他库库) Obsidian 插件项目说明

## 项目概述

SyncFromGit 是一个强大的 Obsidian 插件，用于通过 Git 同步您的笔记库，实现多设备间的无缝同步。该插件提供了一种简单而有效的方式来管理您的笔记，利用 Git 的版本控制功能和远程仓库作为同步中心。

## 技术栈

- **TypeScript**: 提供类型安全的开发体验
- **Obsidian API**: 利用 Obsidian 提供的插件 API
- **Node.js**: 提供底层 API 访问（spawn、path、os、fs 等）
- **Git**: 版本控制和同步机制
- **esbuild**: 快速的 JavaScript 打包工具
- **TypeScript Compiler (tsc)**: 类型检查和转译

## 项目结构

```
sync-from-git/
├── src/
│   ├── main.ts              # 插件主入口文件
│   └── i18n.ts              # 国际化实现
│   └── locales/             # 多语言翻译文件
│       ├── en.json
│       ├── zh.json
│       ├── ja.json
│       └── ko.json
├── dist/                    # 构建输出目录
├── manifest.json            # 插件元数据
├── package.json             # 项目依赖配置
├── tsconfig.json            # TypeScript 配置
├── esbuild.config.mjs       # 构建配置文件
├── version-bump.mjs         # 版本更新脚本
├── versions.json            # 版本发布跟踪
├── README.md                # 项目说明文档
└── 插件技术说明.md           # 详细技术说明文档
```

## 核心功能

### 1. Git 仓库同步
- 支持配置远程 Git 仓库 URL
- 一键同步本地更改到远程仓库
- 支持从远程仓库拉取最新内容

### 2. 文件级同步
- 在文件浏览器中右键菜单增加"提交 GIT 库"功能
- 可将选定的单个文件或整个目录提交到 Git 仓库
- 自动执行 `git add`、`git commit` 和 `git push` 操作

### 3. 仓库管理
- 支持从远程 Git 仓库克隆本地笔记库
- 支持分支切换（使用 Obsidian 仓库名称作为分支名）
- 从侧边栏进行仓库同步操作

### 4. 多设备支持
- 以 Git 仓库作为远程"云盘"，实现跨设备笔记同步
- 支持多分支管理（通过对话框选择）

### 5. 自动同步
- 支持定时自动同步功能
- 可配置同步间隔时间
- 状态栏显示同步状态

## 构建和运行

### 安装依赖
```bash
npm install
```

### 开发模式
```bash
npm run dev
```
这将启动开发模式，监听文件变化并自动重建插件。

### 生产构建
```bash
npm run build
```
这将创建一个优化的生产版本插件，输出到 `dist/` 目录。

### 版本发布
```bash
npm run version
```
这将更新版本号并准备发布所需的文件。

## 开发约定

### 代码风格
- 使用 TypeScript 进行类型安全的开发
- 遵循 Obsidian 插件开发最佳实践
- 使用 ESLint 进行代码质量检查

### 国际化
- 插件支持多种语言（英语、中文、日语、韩语）
- 使用 `i18n.ts` 进行国际化管理
- 翻译文件位于 `src/locales/` 目录下

### Git 操作
- 使用 Node.js 的 `child_process.spawn` 执行 Git 命令
- 封装了常用的 Git 操作（init、add、commit、pull、push 等）
- 包含错误处理和输出解析

### 安全考虑
- 所有文件路径操作都经过验证，防止路径遍历攻击
- 防止命令注入的安全措施
- 用户需要自行负责 Git 仓库的安全性

## 主要组件

### 主类：SyncFromGit
- 继承自 `Plugin` 类
- 管理所有插件功能的生命周期
- 处理设置数据的加载和保存

### 设置面板：SyncFromGitSettingTab
- 继承自 `PluginSettingTab`
- 提供用户配置界面
- 包含 URL 输入、自动同步开关、同步按钮等

### 分支选择对话框：BranchSelectionModal
- 继承自 `Modal`
- 显示远程分支列表供用户选择

### 国际化：i18n.ts
- 提供多语言支持
- 自动检测用户语言环境
- 支持参数化消息替换

## 使用方法

### 配置 Git 仓库
1. 打开插件设置
2. 输入您的 Git 仓库 URL
3. 保存配置

### 同步文件
1. 在文件浏览器中右键点击文件或文件夹
2. 选择"提交 GIT 库"
3. 插件将自动将更改推送到远程仓库

### 克隆远程仓库
1. 在侧边栏点击"拉取 GIT 仓库"按钮
2. 输入 Git 仓库 URL
3. 选择要检出的分支
4. 插件将克隆仓库内容到本地

### 手动同步
1. 在侧边栏使用同步按钮进行手动拉取/推送操作

## 注意事项

- 需要系统已安装 Git 命令行工具
- Git 仓库需要适当的访问权限（如 SSH 密钥或凭证）
- 建议定期备份重要数据
- 仅支持桌面版 Obsidian

## 维护建议

### 依赖更新
- 定期更新 Obsidian API 依赖
- 检查 TypeScript 版本兼容性
- 测试 Git 命令在不同操作系统下的表现

### 功能扩展
- 考虑支持 SSH 认证
- 增加更细粒度的同步控制
- 支持自定义 Git 配置

### 兼容性
- 测试在不同操作系统上的兼容性
- 确保与 Obsidian 新版本的兼容性
- 验证各种 Git 服务器的兼容性

## 已知限制

1. 依赖本地 Git 安装
2. 仅支持桌面版 Obsidian
3. 用户需要自行配置 Git 认证
4. 不支持 Git LFS 或其他高级 Git 功能