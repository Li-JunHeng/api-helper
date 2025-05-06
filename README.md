# API Helper

**API Helper** 是一个 Visual Studio Code 扩展，旨在帮助开发者通过代码中的 `@api` 注释快速管理和补全 API 接口。插件会自动解析项目文件中带有 `@api` 标签的注释，并在用户输入 `api.` 时提供智能补全建议，提升开发效率。

## 功能

- **自动解析 `@api` 注释**：扫描项目文件，提取 `@api` 注释中的 API 信息（如类型、别名、描述）。
- **智能补全**：输入 `api.` 时，显示所有 API 条目的补全建议，支持模糊匹配。
- **动态更新**：实时监听文件变化，自动更新 API 列表。
- **多语言支持**：兼容 JavaScript、Python、C++、Java 等多种语言的注释风格。
- **可自定义**：允许用户配置扫描语言和排除文件夹。
- **手动索引重建**：通过命令 `API Helper: Rebuild Index` 手动刷新 API 列表。

## 安装

1. 打开 VS Code。
2. 进入 **Extensions** 视图（快捷键：`Ctrl+Shift+X` 或 `Cmd+Shift+X`）。
3. 在搜索栏中输入 **API Helper**。
4. 点击 **Install** 按钮安装插件。

或者，你可以从 [VS Code Marketplace](https://marketplace.visualstudio.com/) 下载 `.vsix` 文件，然后手动安装。

## 使用示例

### 1. 添加 `@api` 注释

在代码中添加 `@api` 注释，格式为：`/** @api [类型] [别名] [描述] */` 或语言特定的单行注释格式。示例：

<pre><code class="language-javascript">// @api GET fetchUser Get user information by ID
</code></pre>

<pre><code class="language-python"># @api POST createUser Create a new user
</code></pre>

### 2. 触发补全

在编辑器中输入 `api.`，插件会弹出补全建议：

- 输入 `api.`：显示所有 API 别名（如 `fetchUser`、`createUser`）。
- 输入 `api.f`：显示匹配的别名（如 `fetchUser`）。

### 3. 选择补全项

选择一个补全项后，`api.` 会被替换为选中的别名，例如 `fetchUser`。

### 4. 手动重建索引

如果 API 列表需要更新，可以通过命令面板手动触发：

1. 按 `Ctrl+Shift+P`（或 `Cmd+Shift+P`）打开命令面板。
2. 输入并运行 `API Helper: Rebuild Index`。

## 配置选项

你可以通过 VS Code 的设置界面或编辑 `settings.json` 文件来自定义插件行为。以下是常用配置项：

- **`apiHelper.languages`**  
  指定扫描的语言列表，默认值：`["javascript", "typescript"]`。
  - 示例：`["javascript", "python", "cpp"]`
- **`apiHelper.excludeFolders`**  
  指定排除的文件夹，默认值：`["node_modules", ".history"]`。
  - 示例：`["node_modules", "dist", ".git"]`

示例 `settings.json`：

<pre><code class="language-json">{
  "apiHelper.languages": ["javascript", "python", "cpp"],
  "apiHelper.excludeFolders": ["node_modules", ".history", "dist"]
}
</code></pre>

## 常见问题

### 1. 输入 `api.` 后没有补全建议怎么办？

- 检查项目中是否添加了 `@api` 注释，格式是否正确（`@api [类型] [别名] [描述]`）。
- 确保文件语言在 `apiHelper.languages` 配置中。
- 确认文件不在 `apiHelper.excludeFolders` 列表中。
- 尝试运行 `API Helper: Rebuild Index` 命令刷新索引。

### 2. 如何手动刷新 API 索引？

- 打开命令面板（`Ctrl+Shift+P` 或 `Cmd+Shift+P`）。
- 输入并运行 `API Helper: Rebuild Index`。

### 3. 支持哪些语言？

插件支持多种语言，包括 JavaScript、TypeScript、Python、C++、Java、Go、Ruby、PHP 等。你可以通过 `apiHelper.languages` 配置添加更多语言支持。

### 4. 如何排除特定文件夹？

在 `settings.json` 中修改 `apiHelper.excludeFolders`，添加需要排除的文件夹名称，例如 `.git` 或 `dist`。

## 贡献

欢迎通过 [GitHub 仓库](https://github.com/your-repo/api-helper) 提交 Issue 或 Pull Request 来改进插件。你的反馈对我们非常重要！

## 许可证

本插件采用 [MIT License](https://opensource.org/licenses/MIT) 授权。
