import { App, Plugin, PluginSettingTab, Setting } from 'obsidian';

import MentionSuggest from "./suggest/mention-suggester";

interface PluginSettings {
	triggers: Array<TriggerSetting>;
}

interface TriggerSetting {
	character: string;
	tag: string;
}

const DEFAULT_SETTINGS: PluginSettings = {
	triggers: [{
		character: '@',
		tag: 'person',
	}]
}

export default class MentionSuggesterPlugin extends Plugin {
	settings: PluginSettings;

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new ShortcodeAutocompleteSettingTab(this.app, this));

		this.registerEditorSuggest(new MentionSuggest(this.app, this));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class ShortcodeAutocompleteSettingTab extends PluginSettingTab {
	plugin: MentionSuggesterPlugin;

	constructor(app: App, plugin: MentionSuggesterPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Settings for Mention Suggester.'});

		new Setting(containerEl)
			.setName('Trigger character')
			.setDesc('Character to trigger autocomplete.')
			.addText(text => text
				.setPlaceholder('Enter your trigger symbol')
				.setValue(this.plugin.settings.triggers[0].character)
				.onChange(async (value) => {
					this.plugin.settings.triggers[0].character = value;
					await this.plugin.saveSettings();
				}));
		
		new Setting(containerEl)
			.setName('Tag')
			.setDesc('Populate autocomplete with notes from this tag')
			.addText(text => text
				.setPlaceholder('Enter your tag')
				.setValue(this.plugin.settings.triggers[0].tag)
				.onChange(async (value) => {
					this.plugin.settings.triggers[0].tag = value;
					await this.plugin.saveSettings();
				}));
	}
}
