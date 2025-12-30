import * as vscode from 'vscode';
import { ChatViewProvider } from './providers/chatViewProvider';
import { ApiService } from './services/apiService';
import { FileService } from './services/fileService';

let apiService: ApiService;
let fileService: FileService;

export function activate(context: vscode.ExtensionContext) {
  console.log('Overmind extension activated');

  apiService = new ApiService(context);
  fileService = new FileService();

  const chatProvider = new ChatViewProvider(context.extensionUri, apiService, fileService);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('overmind.chatView', chatProvider)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('overmind.openChat', () => {
      vscode.commands.executeCommand('overmind.chatView.focus');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('overmind.setApiKey', async () => {
      const key = await vscode.window.showInputBox({
        prompt: 'Enter your Overmind API key',
        password: true,
        placeHolder: 'overmind_...',
      });

      if (key) {
        await context.secrets.store('overmind.apiKey', key);
        vscode.window.showInformationMessage('API key saved successfully');
        chatProvider.refresh();
      }
    })
  );
}

export function deactivate() {
  console.log('Overmind extension deactivated');
}
