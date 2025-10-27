import axios from 'axios';
import * as vscode from 'vscode';

export interface ComplexityResult {
    complexity: 'simple' | 'moderate' | 'complex';
    confidence: number;
    metrics: {
        loc: number;
        cyclomatic: number;
        nesting: number;
        loops: number;
        conditionals: number;
    };
    processing_time_ms: number;
    suggestions?: { [key: string]: string };
}

export class ApiClient {
    private getApiUrl(): string {
        const config = vscode.workspace.getConfiguration('codeComplexity');
        return config.get<string>('apiEndpoint', 'http://localhost:8000');
    }

    private getApiKey(): string {
        const config = vscode.workspace.getConfiguration('codeComplexity');
        return config.get<string>('apiKey', '');
    }

    async analyzeCode(code: string): Promise<ComplexityResult> {
        const apiUrl = this.getApiUrl();
        const apiKey = this.getApiKey();

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        };

        try {
            const response = await axios.post(`${apiUrl}/analyze`,
                { code },
                { headers }
            );

            return response.data as ComplexityResult;
        } catch (error: any) {
            console.error('API Error:', error);
            const errorMsg = error.response?.data?.detail || error.message;
            vscode.window.showErrorMessage(
                `API Error: ${errorMsg}. Check your API key in settings.`
            );
            throw error;
        }
    }

    async checkHealth(): Promise<boolean> {
        const apiUrl = this.getApiUrl();
        
        try {
            const response = await axios.get(`${apiUrl}/health`);
            return response.status === 200;
        } catch (error) {
            return false;
        }
    }
}
