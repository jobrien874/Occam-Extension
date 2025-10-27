import * as vscode from 'vscode';
import { ComplexityAnalyzer } from './complexityAnalyzer';

export function activate(context: vscode.ExtensionContext) {
    console.log('Code Complexity Analyzer extension is now active!');

    const analyzer = new ComplexityAnalyzer(context);

    // Register commands
    const analyzeCommand = vscode.commands.registerCommand(
        'codeComplexity.analyzeFunction',
        () => analyzer.analyzeSelection()
    );

    const toggleCommand = vscode.commands.registerCommand(
        'codeComplexity.toggleInlineAnalysis',
        () => analyzer.toggleInlineAnalysis()
    );

    const reportCommand = vscode.commands.registerCommand(
        'codeComplexity.showReport',
        () => showComplexityReport()
    );

    context.subscriptions.push(analyzeCommand, toggleCommand, reportCommand, analyzer);

    // Show welcome message
    vscode.window.showInformationMessage(
        'Code Complexity Analyzer is ready! Configure your API endpoint in settings.'
    );
}

async function showComplexityReport() {
    const panel = vscode.window.createWebviewPanel(
        'complexityReport',
        'Code Complexity Report',
        vscode.ViewColumn.One,
        {
            enableScripts: true,
            retainContextWhenHidden: true
        }
    );

    panel.webview.html = getReportHtml();
}

function getReportHtml(): string {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Code Complexity Report</title>
        <style>
            body {
                font-family: var(--vscode-font-family);
                color: var(--vscode-foreground);
                background-color: var(--vscode-editor-background);
                padding: 20px;
            }
            .header {
                border-bottom: 1px solid var(--vscode-panel-border);
                padding-bottom: 10px;
                margin-bottom: 20px;
            }
            .metric-card {
                background-color: var(--vscode-editor-background);
                border: 1px solid var(--vscode-panel-border);
                border-radius: 5px;
                padding: 15px;
                margin: 10px 0;
            }
            .complexity-simple { border-left: 4px solid #22c55e; }
            .complexity-moderate { border-left: 4px solid #f59e0b; }
            .complexity-complex { border-left: 4px solid #ef4444; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Code Complexity Analysis Report</h1>
            <p>AI-powered complexity analysis for your JavaScript functions</p>
        </div>
        
        <div class="metric-card complexity-simple">
            <h3>✓ Simple Functions</h3>
            <p>Functions with low complexity - easy to understand and maintain</p>
        </div>
        
        <div class="metric-card complexity-moderate">
            <h3>⚠ Moderate Functions</h3>
            <p>Functions with medium complexity - consider refactoring if possible</p>
        </div>
        
        <div class="metric-card complexity-complex">
            <h3>⚠ Complex Functions</h3>
            <p>Functions with high complexity - should be prioritized for refactoring</p>
        </div>
        
        <div class="metric-card">
            <h3>Configuration</h3>
            <p>Configure your API endpoint and key in VS Code settings:</p>
            <ul>
                <li><code>codeComplexity.apiEndpoint</code></li>
                <li><code>codeComplexity.apiKey</code></li>
            </ul>
        </div>
    </body>
    </html>`;
}

export function deactivate() {
    console.log('Code Complexity Analyzer extension is now deactivated');
}