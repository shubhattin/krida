/**
 * Count Devanagari orthographic syllables (akṣaras) for Padavali grid planning.
 *
 * This is deliberately a spelling-based counter, not Sanskrit phonetic scansion:
 * a consonant conjunct with a medial virāma is one unit, while a final
 * consonant-with-virāma remains its own terminal unit.
 */

const DEVANAGARI_INDEPENDENT_VOWEL = /[\u0904-\u0914\u0960-\u0961\u0972-\u0977]/u;
const DEVANAGARI_CONSONANT = /[\u0915-\u0939\u0958-\u095f\u0978-\u097f]/u;
const DEVANAGARI_VOWEL_SIGN = /[\u093e-\u094c\u0962-\u0963]/u;
const DEVANAGARI_NUKTA = '\u093c';
const DEVANAGARI_VIRAMA = '\u094d';
const DEVANAGARI_FINAL_SIGN = /[\u0900-\u0903]/u;
const JOINER = /[\u200c\u200d]/u;

function isBase(character: string): boolean {
  return DEVANAGARI_INDEPENDENT_VOWEL.test(character) || DEVANAGARI_CONSONANT.test(character);
}

function isConsonant(character: string | undefined): character is string {
  return character !== undefined && DEVANAGARI_CONSONANT.test(character);
}

function isJoiner(character: string | undefined): character is string {
  return character !== undefined && JOINER.test(character);
}

function consumeAkshara(characters: readonly string[], start: number): number {
  let index = start + 1;

  while (index < characters.length) {
    const character = characters[index]!;

    if (
      character === DEVANAGARI_NUKTA ||
      DEVANAGARI_VOWEL_SIGN.test(character) ||
      DEVANAGARI_FINAL_SIGN.test(character) ||
      isJoiner(character)
    ) {
      index += 1;
      continue;
    }

    if (character !== DEVANAGARI_VIRAMA) {
      break;
    }

    index += 1;
    while (isJoiner(characters[index])) {
      index += 1;
    }

    if (!isConsonant(characters[index])) {
      break;
    }

    index += 1;
  }

  return index;
}

/**
 * Splits `text` into Devanagari akṣaras (one grid cell each).
 *
 * Whitespace, punctuation, non-Devanagari characters, and unattached combining
 * marks are ignored so unfinished editor input never produces a phantom unit.
 */
export function splitDevanagariAksharas(text: string): string[] {
  const characters = Array.from(text.normalize('NFC'));
  const syllables: string[] = [];

  for (let index = 0; index < characters.length;) {
    const character = characters[index]!;
    if (!isBase(character)) {
      index += 1;
      continue;
    }

    const end = consumeAkshara(characters, index);
    syllables.push(characters.slice(index, end).join(''));
    index = end;
  }

  return syllables;
}

/**
 * Returns the number of Devanagari akṣaras in `text`.
 *
 * Whitespace, punctuation, non-Devanagari characters, and unattached combining
 * marks are ignored so unfinished editor input never produces a phantom count.
 */
export function countDevanagariAksharas(text: string): number {
  return splitDevanagariAksharas(text).length;
}
