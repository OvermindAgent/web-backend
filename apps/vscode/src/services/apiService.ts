import * as vscode from 'vscode';

type Preset = 'fast' | 'edit' | 'planning';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class ApiService {
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  private getConfig() {
    const config = vscode.workspace.getConfiguration('overmind');
    return {
      apiUrl: config.get<string>('apiUrl') || 'https://overmind.vercel.app',
      streaming: config.get<boolean>('streaming') ?? true,
      defaultPreset: config.get<Preset>('defaultPreset') || 'fast',
    };
  }

  async getApiKey(): Promise<string | undefined> {
    return await this.context.secrets.get('overmind.apiKey');
  }

  async chat(
    messages: Message[],
    preset: Preset,
    onChunk?: (content: string) => void
  ): Promise<{ content: string; toolResults?: unknown[] }> {
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      throw new Error('API key not set. Run "Overmind: Set API Key" command.');
    }

    const config = this.getConfig();

    const response = await fetch(`${config.apiUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        messages,
        preset,
        stream: config.streaming && !!onChunk,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    if (config.streaming && onChunk && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'content' && parsed.content) {
                fullContent += parsed.content;
                onChunk(parsed.content);
              }
            } catch {
              continue;
            }
          }
        }
      }

      return { content: fullContent };
    }

    const data = await response.json();
    return { content: data.content, toolResults: data.toolResults };
  }

  async listProjects(): Promise<{ id: string; name: string }[]> {
    const apiKey = await this.getApiKey();
    if (!apiKey) return [];

    const config = this.getConfig();

    try {
      const response = await fetch(`${config.apiUrl}/api/projects`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (!response.ok) return [];

      const data = await response.json();
      return data.projects || [];
    } catch {
      return [];
    }
  }
}
