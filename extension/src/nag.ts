import {
  InlayHint,
  InlayHintKind,
  InlayHintsProvider,
  Position,
  Range,
  TextDocument,
} from "vscode";

import Logger from "./logger";
import * as nagDict from "./nag/mapping.json";

const Parameter: InlayHintKind.Parameter = InlayHintKind.Parameter;

function fromRange({ start, end }: Range): string {
  return `${fromPosition(start)}..${fromPosition(end)}`;
}

function fromPosition({ line, character }: Position): string {
  return `(Ln ${line}, Col ${character})`;
}

function* generateInlayHints(
  document: TextDocument,
  range: Range,
  log: Logger
): Iterable<InlayHint> {
  if (range.isEmpty) {
    return;
  }

  for (let i: number = range.start.line; i <= range.end.line; i++) {
    // This pattern has its own state due to the `g`. So we restrict its scope.
    const pattern = /\$(\d+)/g;
    const textLine = document.lineAt(i);
    let matchingGroups: RegExpExecArray;

    while ((matchingGroups = pattern.exec(textLine.text))) {
      const nagId: string = matchingGroups[1];
      const position = new Position(i, pattern.lastIndex);
      if (!range.contains(position)) {
        continue;
      }
      if (!(nagId in nagDict)) {
        log.info(`Unknown NAG ${fromPosition(position)}: \$${nagId}`);
        continue;
      }
      if (!("glyph" in nagDict[nagId])) {
        continue;
      }
      yield {
        position,
        label: nagDict[nagId].glyph,
        kind: Parameter,
        paddingLeft: true,
        tooltip: nagDict[nagId].text,
      };
    }
  }
}

export function getNagHintsProvider(log: Logger): InlayHintsProvider {
  return {
    provideInlayHints: (document, range) =>
      Array.from(generateInlayHints(document, range, log)),
    resolveInlayHint: (item) => item,
  };
}
