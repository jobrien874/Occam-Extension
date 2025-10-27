import * as vscode from 'vscode';
import { ApiClient, ComplexityResult } from './apiClient';

interface CachedComplexity {
    result: ComplexityResult;
    code: string;
    timestamp: number;
}

export class ComplexityAnalyzer {
    private apiClient: ApiClient;
    private decorationType: vscode.TextEditorDecorationType;
    private inlineEnabled: boolean = true;
    private complexityCache: Map<string, CachedComplexity> = new Map();
    private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    constructor(private context: vscode.ExtensionContext) {
        this.apiClient = new ApiClient();

        this.decorationType = vscode.window.createTextEditorDecorationType({
            after: {
                margin: '0 0 0 1em',
                fontStyle: 'italic'
            }
        });

        // Check API health on activation
        this.checkApiConnection();

        // Register hover provider
        this.registerHoverProvider();

        // Register document change listener for inline decorations
        this.setupInlineDecorations();
    }

    private async checkApiConnection() {
        const isHealthy = await this.apiClient.checkHealth();
        if (!isHealthy) {
            vscode.window.showWarningMessage(
                'Code Complexity API is not responding. Please ensure Docker container is running.',
                'Open Settings'
            ).then(selection => {
                if (selection === 'Open Settings') {
                    vscode.commands.executeCommand('workbench.action.openSettings', 'codeComplexity');
                }
            });
        } else {
            vscode.window.showInformationMessage('Code Complexity API connected successfully!');
        }
    }

    async analyzeSelection() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }

        const selection = editor.selection;
        const code = editor.document.getText(selection.isEmpty ? undefined : selection);

        if (!code.trim()) {
            vscode.window.showErrorMessage('No code selected');
            return;
        }

        try {
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Analyzing code complexity...',
                cancellable: false
            }, async () => {
                const result = await this.apiClient.analyzeCode(code);
                this.showAnalysisResult(result);
            });
        } catch (error) {
            console.error('Analysis failed:', error);
        }
    }

    private showAnalysisResult(result: ComplexityResult) {
        const icon = result.complexity === 'simple' ? '✓' :
                     result.complexity === 'moderate' ? '⚠' : '⚠';

        const metricsText = `LOC: ${result.metrics.loc}, Cyclomatic: ${result.metrics.cyclomatic}, Nesting: ${result.metrics.nesting}`;
        const message = `${icon} Complexity: ${result.complexity.toUpperCase()} (Confidence: ${(result.confidence * 100).toFixed(1)}%)\n\n${metricsText}`;

        const suggestions = result.suggestions && Object.values(result.suggestions).length > 0
            ? Object.values(result.suggestions)
            : null;

        vscode.window.showInformationMessage(
            message,
            ...(suggestions ? ['View Suggestions'] : []),
            'Dismiss'
        ).then(selection => {
            if (selection === 'View Suggestions' && suggestions) {
                this.showSuggestions(suggestions);
            }
        });
    }

    private showSuggestions(suggestions: string[]) {
        const panel = vscode.window.createWebviewPanel(
            'complexitySuggestions',
            'Complexity Suggestions',
            vscode.ViewColumn.Two,
            {}
        );

        panel.webview.html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: var(--vscode-font-family); padding: 20px; }
                    ul { line-height: 1.8; }
                    li { margin: 10px 0; }
                </style>
            </head>
            <body>
                <h2>Suggestions for Improvement</h2>
                <ul>
                    ${suggestions.map(s => `<li>${s}</li>`).join('')}
                </ul>
            </body>
            </html>
        `;
    }

    private registerHoverProvider() {
        const hoverProvider = vscode.languages.registerHoverProvider(
            ['javascript', 'typescript', 'javascriptreact', 'typescriptreact'],
            {
                provideHover: async (document, position) => {
                    const functionRange = this.getFunctionAtPosition(document, position);
                    if (!functionRange) {
                        return null;
                    }

                    const functionCode = document.getText(functionRange);
                    const cacheKey = this.getCacheKey(functionCode);

                    // Check cache first
                    const cached = this.complexityCache.get(cacheKey);
                    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
                        return this.createHoverMarkdown(cached.result);
                    }

                    // Fetch complexity from API
                    try {
                        const result = await this.apiClient.analyzeCode(functionCode);
                        this.complexityCache.set(cacheKey, {
                            result,
                            code: functionCode,
                            timestamp: Date.now()
                        });
                        return this.createHoverMarkdown(result);
                    } catch (error) {
                        console.error('Failed to analyze function on hover:', error);
                        return null;
                    }
                }
            }
        );

        this.context.subscriptions.push(hoverProvider);
    }

    private getFunctionAtPosition(document: vscode.TextDocument, position: vscode.Position): vscode.Range | null {
        const line = document.lineAt(position.line);
        const text = line.text;

        // Check if cursor is on a function declaration
        const functionRegex = /\b(function\s+\w+|const\s+\w+\s*=\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>)|\w+\s*\([^)]*\)\s*\{)/;
        if (!functionRegex.test(text)) {
            return null;
        }

        // Find the function boundaries
        let startLine = position.line;
        let endLine = position.line;
        let braceCount = 0;
        let foundStart = false;

        // Find start of function
        for (let i = position.line; i >= 0; i--) {
            const lineText = document.lineAt(i).text;
            if (functionRegex.test(lineText)) {
                startLine = i;
                foundStart = true;
                break;
            }
            // Stop if we hit another function or empty lines
            if (i < position.line && lineText.trim() === '') {
                break;
            }
        }

        if (!foundStart) {
            return null;
        }

        // Find end of function by counting braces
        for (let i = startLine; i < document.lineCount; i++) {
            const lineText = document.lineAt(i).text;
            for (const char of lineText) {
                if (char === '{') {
                    braceCount++;
                }
                if (char === '}') {
                    braceCount--;
                }
                if (braceCount === 0 && i > startLine) {
                    endLine = i;
                    return new vscode.Range(
                        new vscode.Position(startLine, 0),
                        new vscode.Position(endLine, document.lineAt(endLine).text.length)
                    );
                }
            }
        }

        return null;
    }

    private getCacheKey(code: string): string {
        // Simple hash function for caching
        let hash = 0;
        for (let i = 0; i < code.length; i++) {
            const char = code.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString();
    }

    private createHoverMarkdown(result: ComplexityResult): vscode.Hover {
        const icon = result.complexity === 'simple' ? '✓' :
                     result.complexity === 'moderate' ? '⚠️' : '🔴';

        const markdown = new vscode.MarkdownString();
        markdown.isTrusted = true;
        markdown.supportHtml = true;

        // Compact header
        markdown.appendMarkdown(`**${icon} ${result.complexity.toUpperCase()}** `);
        markdown.appendMarkdown(`(${(result.confidence * 100).toFixed(0)}% confident)\n\n`);

        // Compact metrics on one line
        markdown.appendMarkdown(`LOC: ${result.metrics.loc} | `);
        markdown.appendMarkdown(`Cyclomatic: ${result.metrics.cyclomatic} | `);
        markdown.appendMarkdown(`Nesting: ${result.metrics.nesting}\n`);

        // Only show suggestions if they exist
        if (result.suggestions && Object.keys(result.suggestions).length > 0) {
            const suggestionList = Object.values(result.suggestions);
            if (suggestionList.length > 0) {
                markdown.appendMarkdown(`\n💡 *${suggestionList[0]}*`);
            }
        }

        return new vscode.Hover(markdown);
    }

    private setupInlineDecorations() {
        // Update decorations when active editor changes
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor && this.inlineEnabled) {
                this.updateInlineDecorations(editor);
            }
        }, null, this.context.subscriptions);

        // Update decorations when document changes
        vscode.workspace.onDidChangeTextDocument(event => {
            const editor = vscode.window.activeTextEditor;
            if (editor && event.document === editor.document && this.inlineEnabled) {
                // Debounce updates
                setTimeout(() => this.updateInlineDecorations(editor), 500);
            }
        }, null, this.context.subscriptions);

        // Initial decoration
        if (vscode.window.activeTextEditor && this.inlineEnabled) {
            this.updateInlineDecorations(vscode.window.activeTextEditor);
        }
    }

    private async updateInlineDecorations(editor: vscode.TextEditor) {
        if (!this.inlineEnabled) {
            return;
        }

        const document = editor.document;
        const decorations: vscode.DecorationOptions[] = [];

        // Find all functions in the document
        const functionRegex = /^[\s]*(function\s+\w+|const\s+\w+\s*=\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>)|\w+\s*\([^)]*\)\s*\{)/gm;
        const text = document.getText();
        let match;

        while ((match = functionRegex.exec(text)) !== null) {
            const startPos = document.positionAt(match.index);
            const functionRange = this.getFunctionAtPosition(document, startPos);

            if (functionRange) {
                const functionCode = document.getText(functionRange);
                const cacheKey = this.getCacheKey(functionCode);
                const cached = this.complexityCache.get(cacheKey);

                if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
                    const decoration = this.createInlineDecoration(functionRange, cached.result);
                    decorations.push(decoration);
                }
            }
        }

        editor.setDecorations(this.decorationType, decorations);
    }

    private createInlineDecoration(range: vscode.Range, result: ComplexityResult): vscode.DecorationOptions {
        const icon = result.complexity === 'simple' ? '✓' :
                     result.complexity === 'moderate' ? '⚠️' : '🔴';

        return {
            range: new vscode.Range(range.start, range.start),
            renderOptions: {
                after: {
                    contentText: ` ${icon} ${result.complexity}`,
                    color: result.complexity === 'simple' ? '#22c55e' :
                           result.complexity === 'moderate' ? '#f59e0b' : '#ef4444',
                    fontStyle: 'italic'
                }
            }
        };
    }

    toggleInlineAnalysis() {
        this.inlineEnabled = !this.inlineEnabled;
        vscode.window.showInformationMessage(
            `Inline analysis ${this.inlineEnabled ? 'enabled' : 'disabled'}`
        );

        // Update decorations
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            if (this.inlineEnabled) {
                this.updateInlineDecorations(editor);
            } else {
                editor.setDecorations(this.decorationType, []);
            }
        }
    }

    dispose() {
        this.decorationType.dispose();
    }
}