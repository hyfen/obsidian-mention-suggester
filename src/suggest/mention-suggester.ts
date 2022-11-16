import {
  App,
  Editor,
  EditorPosition,
  EditorSuggest,
  EditorSuggestContext,
  EditorSuggestTriggerInfo,
  MarkdownView,
  TFile,
  getAllTags,
  fuzzySearch,
} from "obsidian";

interface INoteCompletion {
  label: string;
}

export default class MentionSuggester extends EditorSuggest<INoteCompletion> {
  private plugin: ShortcodeAutocompletePlugin;
  private app: App;

  constructor(app: App, plugin: MentionSuggesterPlugin) {
    console.log('constructor');
    super(app);
    this.app = app;
    this.plugin = plugin;
    this.isActive = false;

    this.setInstructions([{ command: "Shift", purpose: "put a space after[[link]]" }]);

    this.scope.register(["Shift"], "Enter", (evt: KeyboardEvent) => {
      this.suggestions.useSelectedItem(evt);
      return false;
    });
  }

  loadAllFiles() {
    const hasTag = (tags: string[], value: string): boolean => {
      if (!tags.length || !Array.isArray(tags)) return false;
      return tags.some(
        (v) => v.toLocaleLowerCase() === value.toLocaleLowerCase()
      );
    };

    const tag = this.plugin.settings.triggers[0].tag.replace('#', '');
    const files = this.app.vault.getMarkdownFiles();

    const candidates: Set<TFile> = new Set();
    for (const file of files) {      
      // TODO: try to count backlinks and make it available as a sort option
      // backlinks = this.app.vault.metadataCache.getBacklinksForFile(file)
      
      const tags =
        getAllTags(
          this.app.metadataCache.getCache(file.path) as CachedMetadata
        ) || [];
      if (hasTag(tags, `#${tag}`)) {
        candidates.add(file);
      }
    }
    this.candidates = candidates;
  }

  getSuggestions(context: EditorSuggestContext): INoteCompletion[] {
    const matches = [...this.candidates].filter((file) => {
      return file.basename.toLocaleLowerCase().includes(context.query.toLocaleLowerCase());
    });
    matches.sort((a, b) => a.basename.localeCompare(b.basename));
    return matches;
  }

  renderSuggestion(suggestion: INoteCompletion, el: HTMLElement): void {
    el.setText(suggestion.basename);
  }

  selectSuggestion(suggestion: INoteCompletion, event: KeyboardEvent | MouseEvent): void {
    const view = app.workspace.getActiveViewOfType(MarkdownView);
    if (!view) {
      return;
    }

    // TODO: generate wikilink properly
    const wikilink = `[[${suggestion.basename}]]${event.shiftKey ? " " : ""}`;
    
    activeView.editor.replaceRange(wikilink, this.context.start, this.context.end);
    this.isActive = false;
  }

  onTrigger(cursor: EditorPosition, editor: Editor, file: TFile): EditorSuggestTriggerInfo {
    const triggerCharacter = this.plugin.settings.triggers[0].character;
    const startPos = this.context?.start || {
      line: cursor.line,
      ch: cursor.ch - triggerCharacter.length,
    };

    // TODO: be smarter about ignoring trigger character in the middle of other stuff.
    if (!editor.getRange(startPos, cursor).startsWith(triggerCharacter)) {
      this.isActive = false;
      return null;
    }

    // load candidates once per triggering, not keystroke
    if (!this.isActive) {
      this.loadAllFiles();
      this.isActive = true;
    }

    return {
      start: startPos,
      end: cursor,
      query: editor.getRange(startPos, cursor).substring(triggerCharacter.length),
    };
  }
}