import { App, TFile } from 'obsidian';

export type Locale = 'en' | 'zh' | 'ja' | 'ko';

export interface LocaleMessages {
	[key: string]: string;
}

// Default English translations (embedded as fallback)
const DEFAULT_MESSAGES: LocaleMessages = {
	'plugin.name': 'SyncFromGit',
	'plugin.description': 'A powerful Obsidian plugin for syncing your vault via Git, enabling seamless synchronization across multiple devices.',

	'command.sync-now': 'Sync Now',
	'command.sync-now.description': 'Perform synchronization immediately',

	'setting.title': 'SyncFromGit Settings',
	'setting.gitUrl': 'Git Repository URL',
	'setting.gitUrl.placeholder': 'https://github.com/user/repo.git',
	'setting.gitUrl.description': 'Enter your Git repository address',
	'setting.autoSync': 'Enable Auto Sync',
	'setting.autoSync.description': 'Enable scheduled automatic synchronization',
	'setting.autoSyncInterval': 'Auto Sync Interval',
	'setting.autoSyncInterval.description': 'Automatic synchronization interval (minutes)',
	'setting.autoSyncInterval.minutes': 'minutes',
	'setting.cloneButton': 'Clone Repository',
	'setting.syncButton': 'Sync',
	'setting.syncNow': 'Sync Now',
	'setting.syncNow.description': 'Perform synchronization immediately',
	'setting.cloneRepository': 'Clone from Git',
	'setting.cloneRepository.description': 'Clone content from remote Git repository to current vault',
	'setting.lastSyncTime': 'Last Sync Time',

	'status.ready': 'Ready',
	'status.syncing': 'Syncing...',
	'status.success': 'Synced',
	'status.error': 'Sync Failed',

	'menu.commitToGit': 'Commit to Git',
	'menu.commitToGit.file': 'Commit file to Git',
	'menu.commitToGit.folder': 'Commit folder to Git',

	'notice.gitUrlRequired': 'Please configure Git repository URL in settings first',
	'notice.notGitRepo': 'Current directory is not a Git repository, initializing...',
	'notice.syncComplete': 'Sync complete: Pull={pull}, Push={push}',
	'notice.pullComplete': 'Pull complete: {result}',
	'notice.noChanges': 'No changes to commit',
	'notice.fileSyncSuccess': 'File synced successfully: {result}',
	'notice.fileNoChanges': 'File has no changes, no commit needed',
	'notice.syncError': 'Sync failed: {error}',
	'notice.fileSyncError': 'File sync failed: {error}',
	'notice.gitUrlInvalid': 'Warning: Git URL format may be incorrect, please check.',
	'notice.pleaseInputGitUrl': 'Please enter the Git repository URL above first',
	'notice.noBranches': 'Failed to get remote branch list',
	'notice.cloningFromBranch': 'Cloning from branch {branch}...',
	'notice.cloneComplete': 'Clone complete!',
	'notice.cloneFailed': 'Clone failed: {error}',
	'notice.getBranchesFailed': 'Failed to get branch list: {error}',

	'modal.selectBranch': 'Select Branch to Checkout',
	'modal.cancel': 'Cancel',

	'ribbon.syncFromGit': 'Sync From Git',
	'branchSelection.title': 'Select Branch to Checkout'
};

class I18n {
	private messages: LocaleMessages = {};
	private currentLocale: Locale = 'en';
	private app: App | null = null;
	private pluginId: string = 'sync-from-git';

	async initialize(app: App, pluginId?: string): Promise<void> {
		this.app = app;
		if (pluginId) {
			this.pluginId = pluginId;
		}

		// Always start with default messages
		this.messages = { ...DEFAULT_MESSAGES };

		const locale = this.detectLocale(app);
		await this.loadLocale(locale);
	}

	private detectLocale(app: App): Locale {
		// Try to get Obsidian's locale first
		let obsidianLocale: string | undefined;

		// Method 1: Try to get from config (Obsidian 1.0+)
		try {
			obsidianLocale = (app.vault as any).config?.language ||
				(app.vault as any).config?.spellcheck?.language;
		} catch (e) {
			// Ignore
		}

		// Method 2: Fallback to browser locale
		if (!obsidianLocale) {
			obsidianLocale = Intl.DateTimeFormat().resolvedOptions().locale;
		}

		console.log(`[SyncFromGit] Detected locale: ${obsidianLocale}`);

		// Map locale to our supported languages
		if (obsidianLocale) {
			const lowerLocale = obsidianLocale.toLowerCase();
			if (lowerLocale.startsWith('zh')) {
				return 'zh';
			} else if (lowerLocale.startsWith('ja')) {
				return 'ja';
			} else if (lowerLocale.startsWith('ko')) {
				return 'ko';
			}
		}

		return 'en';
	}

	async loadLocale(locale: Locale): Promise<void> {
		this.currentLocale = locale;

		if (!this.app) {
			console.warn('[SyncFromGit] App not available, using default messages');
			return;
		}

		try {
			const localeFilePath = `.obsidian/plugins/${this.pluginId}/locales/${locale}.json`;
			
			// Use vault adapter to read file directly
			const adapter = this.app.vault.adapter;
			if (adapter && typeof adapter.read === 'function') {
				const content = await adapter.read(localeFilePath);
				const loadedMessages = JSON.parse(content);
				this.messages = { ...DEFAULT_MESSAGES, ...loadedMessages };
				console.log(`[SyncFromGit] Loaded locale: ${locale} via adapter`);
				return;
			}
			
			// Fallback to getAbstractFileByPath
			const localeFile = this.app.vault.getAbstractFileByPath(localeFilePath);

			if (!localeFile) {
				console.warn(`[SyncFromGit] Locale file not found: ${localeFilePath}`);
				return;
			}

			if (localeFile instanceof TFile) {
				const content = await this.app.vault.read(localeFile);
				const loadedMessages = JSON.parse(content);

				// Merge loaded messages with defaults (loaded takes precedence)
				this.messages = { ...DEFAULT_MESSAGES, ...loadedMessages };
				console.log(`[SyncFromGit] Loaded locale: ${locale}`);
			}
		} catch (error) {
			console.warn(`[SyncFromGit] Failed to load ${locale} locale:`, error);
			// Keep default messages (English)
		}
	}

	t(key: string, params?: Record<string, string>): string {
		let result = this.messages[key] || DEFAULT_MESSAGES[key] || key;

		if (params) {
			for (const [paramKey, paramValue] of Object.entries(params)) {
				result = result.replace(new RegExp(`{${paramKey}}`, 'g'), paramValue);
			}
		}

		return result;
	}

	getCurrentLocale(): Locale {
		return this.currentLocale;
	}
}

export const i18n = new I18n();

export function t(key: string, params?: Record<string, string>): string {
	return i18n.t(key, params);
}
