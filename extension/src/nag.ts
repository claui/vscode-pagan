import {
  Hover,
  HoverProvider,
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
  return `(${fromPosition(start)})..(${fromPosition(end)})`;
}

function fromPosition({ line, character }: Position): string {
  return `line ${line}, char ${character}`;
}

interface NagDef {
  id: string;
  text: string;
  glyph?: string;
  glyphFallback?: string;
}

type Nag = { range: Range } & (NagDef | { unknownNagId: string });
type KnownNagId = keyof typeof nagDict;

function isKnownNagId(nagId: string): nagId is KnownNagId {
  return nagId in nagDict;
}

function* nags(document: TextDocument, range: Range): Iterable<Nag> {
  if (range.isEmpty) {
    return;
  }

  for (let i: number = range.start.line; i <= range.end.line; i++) {
    // This pattern has its own state due to the `g`. So we restrict its scope.
    const pattern = /\$(\d+)/g;
    const textLine = document.lineAt(i);
    let matchingGroups: RegExpExecArray | null;

    while ((matchingGroups = pattern.exec(textLine.text))) {
      const nagRange = new Range(
        i,
        pattern.lastIndex - matchingGroups[0].length,
        i,
        pattern.lastIndex
      );
      if (!range.contains(nagRange.end)) {
        continue;
      }
      const nagId: KnownNagId | string = matchingGroups[1];
      if (isKnownNagId(nagId)) {
        yield { range: nagRange, id: nagId, ...nagDict[nagId] };
      } else {
        yield { range: nagRange, unknownNagId: nagId };
      }
    }
  }
}

function* generateInlayHints(
  document: TextDocument,
  range: Range,
  log: Logger
): Iterable<InlayHint> {
  for (const nag of nags(document, range)) {
    if ("unknownNagId" in nag) {
      log.info(
        `Unknown NAG "\$${nag.unknownNagId}" at ${fromPosition(
          nag.range.start
        )}`
      );
      continue;
    }
    if (!nag.glyph) {
      continue;
    }

    yield {
      position: nag.range.end,
      label: nag.glyph,
      kind: Parameter,
      paddingLeft: true,
      tooltip: nag.text,
    };
  }
}

function getHover(
  document: TextDocument,
  position: Position,
  log: Logger
): Hover | undefined {
  const result: Nag[] = Array.from(
    nags(document, document.lineAt(position.line).range)
  );
  const nag: Nag | undefined = result.find((nag) =>
    nag.range.contains(position)
  );
  if (!nag) {
    return;
  }
  if ("unknownNagId" in nag) {
    return new Hover("Unknown NAG", nag.range);
  } else {
    return new Hover(nag.text, nag.range);
  }
}

export function getNagHintsProvider(log: Logger): InlayHintsProvider {
  return {
    provideInlayHints: (document, range) =>
      Array.from(generateInlayHints(document, range, log)),
    resolveInlayHint: (item) => item,
  };
}

export function getNagHoverProvider(log: Logger): HoverProvider {
  return {
    provideHover: (document, position) => getHover(document, position, log),
  };
}
