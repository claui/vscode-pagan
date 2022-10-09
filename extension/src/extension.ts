import {
  ExtensionContext,
  LanguageStatusItem,
  commands,
  languages,
  window,
  DocumentSelector,
} from "vscode";

import Logger from "./logger";

import { getCurrentTimestamp } from "./time";
import { getNagHintsProvider } from "./nag";

const outputChannel = window.createOutputChannel("Pagan – Chess game viewer");
const languageSelector: DocumentSelector = { language: "pgn" };

const log: Logger = {
  debug: function (...args) {
    this.log("DEBUG", ...args);
  },
  error: function (...args) {
    this.log("ERROR", ...args);
  },
  info: function (...args) {
    this.log("INFO", ...args);
  },
  log: function (level: string, ...args: any[]) {
    const timestamp = getCurrentTimestamp();
    outputChannel.appendLine(`${timestamp} [${level}] ${args.join(" ")}`);
  },
};

const statusItem: LanguageStatusItem = languages.createLanguageStatusItem(
  "pgn.status.item",
  languageSelector
);

export function activate(context: ExtensionContext) {
  commands.registerCommand("pagan.action.showLog", () => {
    outputChannel.show();
  });
  statusItem.command = {
    command: "pagan.action.showLog",
    title: "Show extension log",
  };
  languages.registerInlayHintsProvider(
    languageSelector,
    getNagHintsProvider(log)
  );

  return {};
}

export function deactivate() {}
