import { Plugin, Notice, TAbstractFile, TFile, TFolder, App, Modal, Setting, FileSystemAdapter, PluginSettingTab } from 'obsidian';
import { spawn, exec } from 'child_process';
import * as path from 'path';
import { i18n, t } from './i18n';

interface SyncFromGitSettings {
	gitUrl: string;
	autoSyncEnabled: boolean;
	autoSyncInterval: number;
	lastSyncTime: number;
}

const DEFAULT_SETTINGS: SyncFromGitSettings = {
	gitUrl: '',
	autoSyncEnabled: false,
	autoSyncInterval: 30,
	lastSyncTime: 0
};

export default class SyncFromGit extends Plugin {
	settings: SyncFromGitSettings;
	private syncIntervalId: number | null = null;
	private fileMenuEventRef: any = null;
	private statusBar: HTMLElement | null = null;

	async onload() {
		await this.loadSettings();

		await i18n.initialize(this.app);

		this.statusBar = this.addStatusBarItem();
		this.updateSyncStatus(t('status.ready'), 'ready');

		// 添加右键菜单项：提交GIT库
		this.fileMenuEventRef = this.registerEvent(
			this.app.workspace.on('file-menu', (menu, file) => {
				menu.addItem((item) => {
					item
						.setTitle(t('menu.commitToGit'))
						.setIcon('upload')
						.onClick(async () => {
							await this.syncFileToGit(file);
						});
				});
			})
		);

		// 添加侧边栏图标和功能
		const ribbonIcon = this.addRibbonIcon('refresh-cw', t('ribbon.syncFromGit'), async () => {
			await this.performSync();
		});

		// 添加命令
		this.addCommand({
			id: 'sync-now',
			name: t('command.sync-now'),
			callback: async () => {
				await this.performSync();
			}
		});

		// 添加设置面板
		this.addSettingTab(new SyncFromGitSettingTab(this));

		// 初始化自动同步
		if (this.settings.autoSyncEnabled) {
			this.startAutoSync();
		}
	}

	onunload() {
		if (this.syncIntervalId !== null) {
			window.clearInterval(this.syncIntervalId);
		}
		this.fileMenuEventRef = null;
		this.statusBar = null;
	}

	updateSyncStatus(message: string, type: 'ready' | 'syncing' | 'success' | 'error') {
		if (!this.statusBar) return;

		const icons = {
			ready: '⚪',
			syncing: '🔄',
			success: '✅',
			error: '❌'
		};

		this.statusBar.setText(`${icons[type]} ${message}`);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		if (this.settings.gitUrl && !this.isValidGitUrl(this.settings.gitUrl)) {
			new Notice(t('notice.gitUrlInvalid'));
		}
		await this.saveData(this.settings);
	}

	private isValidGitUrl(url: string): boolean {
		if (!url || url.trim() === '') {
			return true; // 空值允许，在同步时再检查
		}

		// 验证常见的 Git URL 格式
		const patterns = [
			/^https?:\/\/.+\..+\/.+.git$/,  // HTTPS/HTTP: https://github.com/user/repo.git
			/^git@.+\..+:.+.git$/,          // SSH: git@github.com:user/repo.git
			/^ssh:\/\/git@.+\..+:.+.git$/,     // SSH URL: ssh://git@github.com:user/repo.git
			/^[a-z0-9]+:\/\/.+/                  // 其他协议如 git://
		];

		return patterns.some(pattern => pattern.test(url));
	}

	startAutoSync() {
		if (this.syncIntervalId !== null) {
			window.clearInterval(this.syncIntervalId);
		}

		this.syncIntervalId = window.setInterval(async () => {
			if (this.settings.autoSyncEnabled) {
				await this.performSync();
			}
		}, this.settings.autoSyncInterval * 60 * 1000); // 转换为毫秒
	}

	async performSync() {
		if (!this.settings.gitUrl) {
			new Notice(t('notice.gitUrlRequired'));
			return;
		}

		this.updateSyncStatus(t('status.syncing'), 'syncing');

		try {
			// 检查当前路径是否是git仓库，如果不是则初始化
			const isRepo = await this.isGitRepository();
			if (!isRepo) {
				new Notice(t('notice.notGitRepo'));
				await this.initGitRepo();
			}

			// 添加远程仓库
			await this.setRemoteOrigin();

			// 拉取远程更改
			const pullResult = await this.gitPull();
			new Notice(pullResult);

			// 提交本地更改
			const addResult = await this.gitAdd('.');
			const commitResult = await this.gitCommit('Automatic sync');

			if (commitResult !== 'No changes to commit') {
				const pushResult = await this.gitPush();
				new Notice(t('notice.syncComplete', { pull: pullResult, push: pushResult }));
			} else {
				new Notice(t('notice.pullComplete', { result: pullResult }));
			}

			// 更新最后同步时间
			this.settings.lastSyncTime = Date.now();
			await this.saveSettings();

			this.updateSyncStatus(t('status.success'), 'success');
		} catch (error) {
			console.error(t('notice.syncError', { error: error.message }), error);
			new Notice(t('notice.syncError', { error: error.message }));
			this.updateSyncStatus(t('status.error'), 'error');
		}
	}

	async syncFileToGit(file: TAbstractFile) {
		if (!this.settings.gitUrl) {
			new Notice(t('notice.gitUrlRequired'));
			return;
		}

		this.updateSyncStatus(t('status.syncing'), 'syncing');

		try {
			// 检查当前路径是否是git仓库
			const isRepo = await this.isGitRepository();
			if (!isRepo) {
				new Notice(t('notice.notGitRepo'));
				await this.initGitRepo();
			}

			// 添加远程仓库
			await this.setRemoteOrigin();

			// 如果是文件夹，则递归添加其内容
			let relativePath: string;
			if (file instanceof TFolder) {
				relativePath = this.getRelativePath(file);
			} else {
				relativePath = this.getRelativePath(file.parent) + '/' + file.name;
			}

			// 添加文件到暂存区
			const addResult = await this.gitAdd(relativePath);

			// 提交更改
			const commitResult = await this.gitCommit(`Sync: ${relativePath}`);

			if (commitResult !== 'No changes to commit') {
				// 推送到远程仓库
				const pushResult = await this.gitPush();
				new Notice(t('notice.fileSyncSuccess', { result: pushResult }));
			} else {
				new Notice(t('notice.fileNoChanges'));
			}

			this.updateSyncStatus(t('status.success'), 'success');
		} catch (error) {
			console.error(t('notice.fileSyncError', { error: error.message }), error);
			new Notice(t('notice.fileSyncError', { error: error.message }));
			this.updateSyncStatus(t('status.error'), 'error');
		}
	}

	private getRelativePath(file: TAbstractFile | null): string {
		if (!file) return '.';
		if (file.path === '/') return '.';

		const relativePath = file.path.startsWith('/') ? file.path.substring(1) : file.path;

		if (!this.isValidFilePath(relativePath)) {
			throw new Error(`Invalid file path: ${relativePath}`);
		}

		return relativePath;
	}

	private isValidFilePath(path: string): boolean {
		if (!path || path.trim() === '') return true;

		const normalizedPath = path.replace(/\\/g, '/');

		const dangerousPatterns = [
			/\.\./,  // Path traversal attempt
			/^\/+/,   // Absolute path from root
			/\*|/,    // Wildcards in paths
			/<|>/,    // HTML injection attempt
		];

		return !dangerousPatterns.some(pattern => pattern.test(normalizedPath));
	}

	private async executeGitCommand(args: string[]): Promise<string> {
		return new Promise((resolve, reject) => {
			const adapter = this.app.vault.adapter as FileSystemAdapter;
			const vaultBasePath = adapter.getBasePath();

			const childProcess = spawn('git', args, {
				cwd: vaultBasePath,
				env: process.env
			});

			let output = '';
			let errorOutput = '';

			childProcess.stdout.on('data', (data) => {
				output += data.toString();
			});

			childProcess.stderr.on('data', (data) => {
				errorOutput += data.toString();
			});

			childProcess.on('close', (code) => {
				if (code === 0 || output.trim().includes('Already up')) {
					resolve(output.trim());
				} else {
					reject(new Error(errorOutput || `Git command failed with code ${code}: ${args.join(' ')}`));
				}
			});
		});
	}

	async isGitRepository(): Promise<boolean> {
		try {
			await this.executeGitCommand(['status']);
			return true;
		} catch (error) {
			return false;
		}
	}

	async initGitRepo(): Promise<void> {
		await this.executeGitCommand(['init']);
		await this.executeGitCommand(['config', 'user.email', 'sync-from-git@example.com']);
		await this.executeGitCommand(['config', 'user.name', 'SyncFromGit']);
	}

	async setRemoteOrigin(): Promise<void> {
		try {
			await this.executeGitCommand(['remote', 'remove', 'origin']);
		} catch (e) {
			// 如果远程origin不存在，移除操作会失败，这是正常的
		}

		await this.executeGitCommand(['remote', 'add', 'origin', this.settings.gitUrl]);
	}

	async gitPull(): Promise<string> {
		return this.executeGitCommand(['pull', 'origin', this.getCurrentBranch()]);
	}

	async gitAdd(path: string): Promise<string> {
		return this.executeGitCommand(['add', path]);
	}

	async gitCommit(message: string): Promise<string> {
		try {
			return await this.executeGitCommand(['commit', '-m', message]);
		} catch (error) {
			if (error.message.includes('nothing to commit')) {
				return 'No changes to commit';
			}
			throw error;
		}
	}

	async gitPush(): Promise<string> {
		return this.executeGitCommand(['push', 'origin', this.getCurrentBranch()]);
	}

	private getCurrentBranch(): string {
		// 使用Obsidian仓库名称作为分支名，转换为有效的Git分支名
		const vaultName = this.app.vault.getName();
		return vaultName.replace(/[^a-zA-Z0-9\-_]/g, '-').toLowerCase() || 'main';
	}

	async cloneFromGit(gitUrl: string, branch: string): Promise<void> {
		return new Promise((resolve, reject) => {
			const adapter = this.app.vault.adapter as FileSystemAdapter;
			const vaultBasePath = adapter.getBasePath();

			// 获取父目录路径，因为我们将在那里执行克隆
			const parentDir = path.dirname(vaultBasePath);
			const vaultName = path.basename(vaultBasePath);

			const childProcess = spawn('git', ['clone', '--branch', branch, gitUrl, vaultName], {
				cwd: parentDir,
				env: process.env
			});

			let output = '';
			let errorOutput = '';

			childProcess.stdout.on('data', (data) => {
				output += data.toString();
			});

			childProcess.stderr.on('data', (data) => {
				errorOutput += data.toString();
			});

			childProcess.on('close', (code) => {
				if (code === 0) {
					resolve();
				} else {
					reject(new Error(errorOutput || `Git clone failed with code ${code}`));
				}
			});
		});
	}

	async getRemoteBranches(gitUrl: string): Promise<string[]> {
		return new Promise((resolve, reject) => {
			const tempDir = path.join(require('os').tmpdir(), 'sync-from-git-temp-' + Date.now());

			// 首先创建临时目录
			require('fs').mkdirSync(tempDir, { recursive: true });

			const childProcess = spawn('git', ['ls-remote', '--heads', gitUrl], {
				cwd: tempDir,
				env: process.env
			});

			let output = '';
			let errorOutput = '';

			childProcess.stdout.on('data', (data) => {
				output += data.toString();
			});

			childProcess.stderr.on('data', (data) => {
				errorOutput += data.toString();
			});

			childProcess.on('close', (code) => {
				try {
					// 清理临时目录
					require('fs').rmSync(tempDir, { recursive: true, force: true });

					if (code === 0) {
						// 解析分支列表
						const branches = output.split('\n')
							.filter(line => line.trim() !== '')
							.map(line => {
								// 格式通常是: <hash>\trefs/heads/<branch-name>
								const parts = line.split('\t');
								if (parts.length >= 2) {
									return parts[1].replace('refs/heads/', '');
								}
								return '';
							})
							.filter(branch => branch !== '');

						resolve(branches);
					} else {
						reject(new Error(errorOutput || `Failed to get remote branches with code ${code}`));
					}
				} catch (cleanupError) {
					reject(cleanupError);
				}
			});
		});
	}
}

// 分支选择对话框
class BranchSelectionModal extends Modal {
	result: string | null = null;
	onSubmit: (branch: string) => void;

	constructor(app: App, branches: string[], onSubmit: (branch: string) => void) {
		super(app);
		this.onSubmit = onSubmit;

		// 创建分支选择界面
		const { contentEl } = this;
		contentEl.createEl('h3', { text: t('branchSelection.title') });

		branches.forEach(branch => {
			const branchButton = contentEl.createEl('button', {
				text: branch,
				cls: 'mod-cta',
				attr: { style: 'display: block; width: 100%; margin-bottom: 10px;' }
			});

			branchButton.addEventListener('click', () => {
				this.onSubmit(branch);
				this.close();
			});
		});

		// 添加取消按钮
		const cancelButton = contentEl.createEl('button', {
			text: t('modal.cancel'),
			attr: { style: 'display: block; width: 100%;' }
		});

		cancelButton.addEventListener('click', () => {
			this.close();
		});
	}
}

class SyncFromGitSettingTab extends PluginSettingTab {
	plugin: SyncFromGit;

	constructor(plugin: SyncFromGit) {
		super(plugin.app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: t('setting.title') });

		new Setting(containerEl)
			.setName(t('setting.gitUrl'))
			.setDesc(t('setting.gitUrl.description'))
			.addText(text => text
				.setPlaceholder(t('setting.gitUrl.placeholder'))
				.setValue(this.plugin.settings.gitUrl)
				.onChange(async (value) => {
					this.plugin.settings.gitUrl = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName(t('setting.autoSync'))
			.setDesc(t('setting.autoSync.description'))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoSyncEnabled)
				.onChange(async (value) => {
					this.plugin.settings.autoSyncEnabled = value;
					await this.plugin.saveSettings();

					if (value) {
						this.plugin.startAutoSync();
					} else if (this.plugin['syncIntervalId'] !== null) {
						window.clearInterval(this.plugin['syncIntervalId']);
						this.plugin['syncIntervalId'] = null;
					}
				}));

		if (this.plugin.settings.autoSyncEnabled) {
			new Setting(containerEl)
				.setName(t('setting.autoSyncInterval'))
				.setDesc(t('setting.autoSyncInterval.description'))
				.addSlider(slider => slider
					.setLimits(5, 120, 5)
					.setValue(this.plugin.settings.autoSyncInterval)
					.onChange(async (value) => {
						this.plugin.settings.autoSyncInterval = value;
						await this.plugin.saveSettings();

						// 重新启动自动同步以应用新间隔
						if (this.plugin.settings.autoSyncEnabled) {
							this.plugin.startAutoSync();
						}
					}))
				.setDesc(t('setting.autoSyncInterval.minutes'));
		}

		new Setting(containerEl)
			.setName(t('setting.syncNow'))
			.setDesc(t('setting.syncNow.description'))
			.addButton(btn => btn
				.setButtonText(t('setting.syncButton'))
				.setCta()
				.onClick(async () => {
					await this.plugin.performSync();
				}));

		// 添加克隆仓库按钮
		new Setting(containerEl)
			.setName(t('setting.cloneRepository'))
			.setDesc(t('setting.cloneRepository.description'))
			.addButton(btn => btn
				.setButtonText(t('setting.cloneButton'))
				.setWarning()
				.onClick(async () => {
					const gitUrl = this.plugin.settings.gitUrl;
					if (!gitUrl) {
						new Notice(t('notice.pleaseInputGitUrl'));
						return;
					}

					try {
						// 获取远程分支列表
						const branches = await this.plugin.getRemoteBranches(gitUrl);
						if (branches.length === 0) {
							new Notice(t('notice.noBranches'));
							return;
						}

						// 显示分支选择对话框
						new BranchSelectionModal(this.plugin.app, branches, async (selectedBranch) => {
							try {
								new Notice(t('notice.cloningFromBranch', { branch: selectedBranch }));
								await this.plugin.cloneFromGit(gitUrl, selectedBranch);
								new Notice(t('notice.cloneComplete'));
							} catch (error) {
								console.error('克隆失败:', error);
								new Notice(t('notice.cloneFailed', { error: error.message }));
							}
						}).open();
					} catch (error) {
						console.error('获取分支列表失败:', error);
						new Notice(t('notice.getBranchesFailed', { error: error.message }));
					}
				}));

		if (this.plugin.settings.lastSyncTime > 0) {
			const lastSyncStr = new Date(this.plugin.settings.lastSyncTime).toLocaleString();
			containerEl.createEl('div', {
				text: `${t('setting.lastSyncTime')}: ${lastSyncStr}`,
				cls: 'setting-item-description'
			});
		}
	}
}