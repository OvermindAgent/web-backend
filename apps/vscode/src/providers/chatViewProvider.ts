import * as vscode from 'vscode';
import { ApiService } from '../services/apiService';
import { FileService } from '../services/fileService';

type Preset = 'fast' | 'edit' | 'planning';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export class ChatViewProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private messages: Message[] = [];
  private preset: Preset = 'fast';

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly apiService: ApiService,
    private readonly fileService: FileService
  ) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    webviewView.webview.html = this.getHtmlContent();

    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.type) {
        case 'send':
          await this.handleSend(message.content);
          break;
        case 'setPreset':
          this.preset = message.preset;
          break;
        case 'clear':
          this.messages = [];
          this.updateMessages();
          break;
      }
    });
  }

  refresh(): void {
    if (this._view) {
      this._view.webview.html = this.getHtmlContent();
    }
  }

  private async handleSend(content: string): Promise<void> {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
    };

    this.messages.push(userMessage);
    this.updateMessages();

    const assistantId = (Date.now() + 1).toString();
    this.messages.push({ id: assistantId, role: 'assistant', content: '' });

    try {
      const currentFile = this.fileService.getCurrentFile();
      const contextMessages = this.messages.slice(0, -1).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      if (currentFile) {
        contextMessages.unshift({
          role: 'user' as const,
          content: `[Current file: ${currentFile.path}]\n\n${currentFile.content.substring(0, 2000)}`,
        });
      }

      await this.apiService.chat(
        contextMessages,
        this.preset,
        (chunk) => {
          const idx = this.messages.findIndex((m) => m.id === assistantId);
          if (idx !== -1) {
            this.messages[idx].content += chunk;
            this.updateMessages();
          }
        }
      );
    } catch (error) {
      const idx = this.messages.findIndex((m) => m.id === assistantId);
      if (idx !== -1) {
        this.messages[idx].content =
          error instanceof Error ? error.message : 'An error occurred';
        this.updateMessages();
      }
    }
  }

  private updateMessages(): void {
    this._view?.webview.postMessage({
      type: 'messages',
      messages: this.messages,
    });
  }

  private getHtmlContent(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Overmind</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--vscode-font-family);
      background: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .header {
      padding: 12px;
      border-bottom: 1px solid var(--vscode-panel-border);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .header h1 {
      font-size: 14px;
      font-weight: 600;
      flex: 1;
    }
    .preset-btn {
      padding: 4px 8px;
      font-size: 11px;
      border: 1px solid var(--vscode-button-border);
      background: transparent;
      color: var(--vscode-button-secondaryForeground);
      border-radius: 4px;
      cursor: pointer;
    }
    .preset-btn.active {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }
    .messages {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
    }
    .message {
      margin-bottom: 12px;
      padding: 8px 12px;
      border-radius: 8px;
      max-width: 90%;
    }
    .message.user {
      background: var(--vscode-button-background);
      margin-left: auto;
    }
    .message.assistant {
      background: var(--vscode-editor-inactiveSelectionBackground);
    }
    .message pre {
      background: var(--vscode-textCodeBlock-background);
      padding: 8px;
      border-radius: 4px;
      overflow-x: auto;
      margin: 8px 0;
    }
    .input-area {
      padding: 12px;
      border-top: 1px solid var(--vscode-panel-border);
      display: flex;
      gap: 8px;
    }
    .input-area input {
      flex: 1;
      padding: 8px;
      border: 1px solid var(--vscode-input-border);
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border-radius: 4px;
      font-size: 13px;
    }
    .input-area button {
      padding: 8px 16px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    .input-area button:disabled {
      opacity: 0.5;
    }
    .empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      text-align: center;
      padding: 24px;
    }
    .empty h2 { margin-bottom: 8px; }
    .empty p { color: var(--vscode-descriptionForeground); font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🧠 Overmind</h1>
    <button class="preset-btn active" data-preset="fast">Fast</button>
    <button class="preset-btn" data-preset="edit">Edit</button>
    <button class="preset-btn" data-preset="planning">Plan</button>
  </div>
  
  <div class="messages" id="messages">
    <div class="empty">
      <h2>Welcome to Overmind</h2>
      <p>Your AI assistant for Roblox development.<br>Ask anything about your project!</p>
    </div>
  </div>
  
  <div class="input-area">
    <input type="text" id="input" placeholder="Ask Overmind..." />
    <button id="send">Send</button>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    const messagesEl = document.getElementById('messages');
    const inputEl = document.getElementById('input');
    const sendBtn = document.getElementById('send');
    const presetBtns = document.querySelectorAll('.preset-btn');
    
    let currentPreset = 'fast';
    let messages = [];
    
    presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        presetBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentPreset = btn.dataset.preset;
        vscode.postMessage({ type: 'setPreset', preset: currentPreset });
      });
    });
    
    function render() {
      if (messages.length === 0) {
        messagesEl.innerHTML = '<div class="empty"><h2>Welcome to Overmind</h2><p>Your AI assistant for Roblox development.<br>Ask anything about your project!</p></div>';
        return;
      }
      
      messagesEl.innerHTML = messages.map(m => 
        '<div class="message ' + m.role + '">' + escapeHtml(m.content) + '</div>'
      ).join('');
      
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
    
    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
    
    function send() {
      const content = inputEl.value.trim();
      if (!content) return;
      
      inputEl.value = '';
      vscode.postMessage({ type: 'send', content });
    }
    
    sendBtn.addEventListener('click', send);
    inputEl.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') send();
    });
    
    window.addEventListener('message', (e) => {
      const msg = e.data;
      if (msg.type === 'messages') {
        messages = msg.messages;
        render();
      }
    });
  </script>
</body>
</html>`;
  }
}
