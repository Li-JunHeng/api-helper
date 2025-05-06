import * as vscode from 'vscode';
import * as path from 'path';

interface ApiInfo {
    type: string;
    alias: string;
    description: string;
    file: string;
}

let apiList: ApiInfo[] = [];

// 各语言注释风格映射，以及 fallback
const commentSyntax: Record<string, { line: string[]; block: [string, string][] }> = {
    javascript: { line: ['//'], block: [['/*', '*/']] },
    typescript: { line: ['//'], block: [['/*', '*/']] },
    python: { line: ['#'], block: [['"""', '"""'], ["'''", "'''"]] },
    shellscript: { line: ['#'], block: [] },
    sql: { line: ['--'], block: [['/*', '*/']] },
    haskell: { line: ['--'], block: [['{-', '-}']] },
    lua: { line: ['--'], block: [] },
    html: { line: [], block: [['<!--', '-->']] },
    xml: { line: [], block: [['<!--', '-->']] },
    cpp: { line: ['//'], block: [['/*', '*/']] }, // C++
    java: { line: ['//'], block: [['/*', '*/']] }, // Java
    csharp: { line: ['//'], block: [['/*', '*/']] }, // C#
    go: { line: ['//'], block: [['/*', '*/']] }, // Go
    ruby: { line: ['#'], block: [['=begin', '=end']] }, // Ruby
    php: { line: ['//', '#'], block: [['/*', '*/']] }, // PHP
    css: { line: [], block: [['/*', '*/']] }, // CSS
    markdown: { line: [], block: [['<!--', '-->']] }, // Markdown
    yaml: { line: ['#'], block: [] }, // YAML
    json: { line: [], block: [] }, // JSON
};
const fallbackSyntax = {
    line: ['//', '#', '--', ';'],
    block: [['/*', '*/'], ['<!--', '-->']],
};

// 将 list 按 alias 去重，保留首次出现
function dedupeApiList(list: ApiInfo[]): ApiInfo[] {
    return Array.from(
        new Map(list.map(item => [item.alias, item])).values()
    );
}

// 逃逸用于构造正则
function escapeForRegex(s: string) {
    return s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

// 解析文档中的 @api 注释
function parseApiComments(doc: vscode.TextDocument) {
    const text = doc.getText();
    if (text.length > 1_000_000) return;

    const syntax = commentSyntax[doc.languageId] ?? fallbackSyntax;
    const { line: lineTokens, block: blockTokens } = syntax;

    // block 注释
    for (const [start, end] of blockTokens) {
        const rgx = new RegExp(
            `${escapeForRegex(start)}\\s*@api\\s+(\\w+)\\s+(\\w+)\\s+([\\s\\S]*?)${escapeForRegex(end)}`,
            'g'
        );
        let m: RegExpExecArray | null;
        while ((m = rgx.exec(text))) {
            apiList.push({
                type: m[1],
                alias: m[2],
                description: m[3].trim(),
                file: doc.uri.fsPath
            });
        }
    }

    // 单行注释
    const lineRegexes = lineTokens.map(tok =>
        new RegExp(`^\\s*${escapeForRegex(tok)}\\s*@api\\s+(\\w+)\\s+(\\w+)\\s+(.+)$`)
    );
    for (const line of text.split('\n')) {
        for (const rgx of lineRegexes) {
            const m = rgx.exec(line);
            if (m) {
                apiList.push({
                    type: m[1],
                    alias: m[2],
                    description: m[3].trim(),
                    file: doc.uri.fsPath
                });
            }
        }
    }
}

async function parseAllWorkspaceFiles() {
    apiList = [];

    // Get user configuration
    const config = vscode.workspace.getConfiguration('apiHelper');
    const langs: string[] = config.get('languages', ['javascript', 'typescript']); // Default languages
    const excludes: string[] = config.get('excludeFolders', ['node_modules']);     // Default exclusions

    // Map languages to file extensions
    const extensionMap: Record<string, string[]> = {
        javascript: ['js'],
        typescript: ['ts'],
        python: ['py'],
        java: ['java'],
        cpp: ['cpp', 'cc', 'cxx'],
        csharp: ['cs'],
        go: ['go'],
        ruby: ['rb'],
        php: ['php'],
        // Add more mappings as needed
    };

    // Construct includePattern
    const includeExt = langs
        .flatMap(lang => extensionMap[lang.toLowerCase()] || [lang]) // Use lang as fallback if no mapping
        .filter(Boolean) // Remove empty entries
        .join(',');

    const includePattern = includeExt ? `**/*.{${includeExt}}` : '**/*'; // Fallback to all files if no extensions

    // Construct excludePattern
    const excludePattern = excludes.length
        ? `**/{${excludes.join(',')}}/**` // Match folder contents recursively
        : undefined;

    // Find files using the patterns
    const files = await vscode.workspace.findFiles(includePattern, excludePattern);

    // Process each file
    await Promise.all(files.map(async uri => {
        try {
            const doc = await vscode.workspace.openTextDocument(uri);
            parseApiComments(doc);
        } catch {
            // Ignore files that can’t be opened (e.g., binary or permission issues)
        }
    }));

    // Deduplicate the API list
    apiList = dedupeApiList(apiList);
}

// 增量解析并去重
function parseAndDedupeDocument(doc: vscode.TextDocument) {
    parseApiComments(doc);
    apiList = dedupeApiList(apiList);
}

export function activate(context: vscode.ExtensionContext) {
    console.log('API Helper 激活');

    // 初次扫描
    parseAllWorkspaceFiles();

    // 监听文件增删改名做全量重建
    context.subscriptions.push(
        vscode.workspace.onDidCreateFiles(() => parseAllWorkspaceFiles()),
        vscode.workspace.onDidDeleteFiles(() => parseAllWorkspaceFiles()),
        vscode.workspace.onDidRenameFiles(() => parseAllWorkspaceFiles())
    );

    // 打开/修改文档时增量解析
    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(doc => parseAndDedupeDocument(doc)),
        vscode.workspace.onDidChangeTextDocument(e => parseAndDedupeDocument(e.document))
    );

    // 注册补全：匹配所有磁盘文件，以 '.' 触发
    const provider = vscode.languages.registerCompletionItemProvider(
        { scheme: 'file' },
        {
            provideCompletionItems(document, position) {
                const line = document.lineAt(position).text.slice(0, position.character);

                // 场景1：纯 api.，展示全部 alias 并删除前缀
                if (/\bapi\.\s*$/.test(line)) {
                    const prefixLen = 4; // 'api.'.length
                    const startPos = position.with({ character: position.character - prefixLen });
                    const replaceRange = new vscode.Range(startPos, position);

                    return apiList.map(api => {
                        const item = new vscode.CompletionItem(api.alias, vscode.CompletionItemKind.Field);
                        item.insertText = api.alias;
                        item.range = replaceRange;
                        item.filterText = `api.${api.alias}`;
                        item.detail = `Type: ${api.type} — ${path.relative(vscode.workspace.rootPath || '', api.file)}`;
                        item.documentation = new vscode.MarkdownString(api.description);
                        return item;
                    });
                }

                // 场景2：api.x，模糊匹配 alias
                const wordRange = document.getWordRangeAtPosition(position)
                    || new vscode.Range(position, position);
                const word = document.getText(wordRange).toLowerCase();
                if (word) {
                    return apiList
                        .filter(api => api.alias.toLowerCase().includes(word))
                        .map(api => {
                            const item = new vscode.CompletionItem(api.alias, vscode.CompletionItemKind.Field);
                            item.insertText = api.alias;
                            item.range = wordRange;
                            item.detail = `Type: ${api.type} — ${path.relative(vscode.workspace.rootPath || '', api.file)}`;
                            item.documentation = new vscode.MarkdownString(api.description);
                            return item;
                        });
                }

                return [];
            }
        },
        '.' // 触发字符
    );

    context.subscriptions.push(provider);

    // 注册重建索引命令
    const rebuild = vscode.commands.registerCommand('apiHelper.rebuildIndex', async () => {
        await parseAllWorkspaceFiles();
        vscode.window.showInformationMessage('✅ API 索引已重建');
    });
    context.subscriptions.push(rebuild);
}

export function deactivate() {
    console.log('API Helper 已停用');
}