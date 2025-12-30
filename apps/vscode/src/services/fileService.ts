import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

type ScriptSuffix = '.server.luau' | '.client.luau' | '.module.luau';

export class FileService {
  private getWorkspaceRoot(): string | undefined {
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  }

  private enforceRobloxSuffix(filePath: string): string {
    if (!filePath.endsWith('.luau') && !filePath.endsWith('.lua')) {
      return filePath;
    }

    const hasValidSuffix = 
      filePath.endsWith('.server.luau') ||
      filePath.endsWith('.client.luau') ||
      filePath.endsWith('.module.luau');

    if (hasValidSuffix) {
      return filePath;
    }

    const basePath = filePath.replace(/\.luau?$/, '');
    const suffix = this.detectSuffix(basePath);
    return `${basePath}${suffix}`;
  }

  private detectSuffix(basePath: string): ScriptSuffix {
    const normalized = basePath.toLowerCase();

    if (normalized.includes('server') || normalized.includes('/server/')) {
      return '.server.luau';
    }
    if (normalized.includes('client') || normalized.includes('/client/') || normalized.includes('starterplayer')) {
      return '.client.luau';
    }
    return '.module.luau';
  }

  async createFile(relativePath: string, content: string): Promise<void> {
    const root = this.getWorkspaceRoot();
    if (!root) {
      throw new Error('No workspace folder open');
    }

    const enforcedPath = this.enforceRobloxSuffix(relativePath);
    const fullPath = path.join(root, enforcedPath);
    const dir = path.dirname(fullPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(fullPath, content, 'utf-8');

    const document = await vscode.workspace.openTextDocument(fullPath);
    await vscode.window.showTextDocument(document);

    vscode.window.showInformationMessage(`Created: ${enforcedPath}`);
  }

  async updateFile(relativePath: string, content: string): Promise<void> {
    const root = this.getWorkspaceRoot();
    if (!root) {
      throw new Error('No workspace folder open');
    }

    const fullPath = path.join(root, relativePath);

    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found: ${relativePath}`);
    }

    fs.writeFileSync(fullPath, content, 'utf-8');

    const document = await vscode.workspace.openTextDocument(fullPath);
    await vscode.window.showTextDocument(document);

    vscode.window.showInformationMessage(`Updated: ${relativePath}`);
  }

  async deleteFile(relativePath: string): Promise<void> {
    const root = this.getWorkspaceRoot();
    if (!root) {
      throw new Error('No workspace folder open');
    }

    const fullPath = path.join(root, relativePath);

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      vscode.window.showInformationMessage(`Deleted: ${relativePath}`);
    }
  }

  async readFile(relativePath: string): Promise<string> {
    const root = this.getWorkspaceRoot();
    if (!root) {
      throw new Error('No workspace folder open');
    }

    const fullPath = path.join(root, relativePath);
    return fs.readFileSync(fullPath, 'utf-8');
  }

  async createFolder(relativePath: string): Promise<void> {
    const root = this.getWorkspaceRoot();
    if (!root) {
      throw new Error('No workspace folder open');
    }

    const fullPath = path.join(root, relativePath);
    fs.mkdirSync(fullPath, { recursive: true });

    vscode.window.showInformationMessage(`Created folder: ${relativePath}`);
  }

  getCurrentFile(): { path: string; content: string } | undefined {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return undefined;

    const root = this.getWorkspaceRoot();
    if (!root) return undefined;

    const relativePath = path.relative(root, editor.document.uri.fsPath);
    return {
      path: relativePath,
      content: editor.document.getText(),
    };
  }
}
