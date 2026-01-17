import { App, TFile } from 'obsidian';

export type Locale = 'en' | 'zh' | 'ja' | 'ko';

export interface LocaleMessages {
	[key: string]: string;
}

class I18n {
	private messages: LocaleMessages = {};
	private currentLocale: Locale = 'en';
	private app: App | null = null;

	async initialize(app: App): Promise<void> {
		this.app = app;
		const locale = this.detectLocale(app);
		await this.loadLocale(locale);
	}

	private detectLocale(app: App): Locale {
		const obsidianLocale = (app.vault as any).config?.spellcheck?.language ||
			Intl.DateTimeFormat().resolvedOptions().locale;

		if (obsidianLocale.startsWith('zh')) {
			return 'zh';
		} else if (obsidianLocale.startsWith('ja')) {
			return 'ja';
		} else if (obsidianLocale.startsWith('ko')) {
			return 'ko';
		}

		return 'en';
	}

	async loadLocale(locale: Locale): Promise<void> {
		this.currentLocale = locale;

		if (!this.app) return;

		try {
			const localeFile = this.app.vault.getAbstractFileByPath(
				`.obsidian/plugins/${this.getPluginId()}/locales/${locale}.json`
			);

			if (localeFile instanceof TFile) {
				const content = await this.app.vault.read(localeFile);
				this.messages = JSON.parse(content);
				return;
			}
		} catch (error) {
			console.warn(`Failed to load ${locale} locale, using default`);
		}

		this.messages = {};
	}

	private getPluginId(): string {
		return 'sync-from-git';
	}

	t(key: string, params?: Record<string, string>): string {
		let result = this.messages[key] || key;

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
