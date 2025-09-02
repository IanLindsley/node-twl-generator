# twl-generator

Generate term-to-article lists from unfoldingWord en_tw archive for Bible books. Works in both Node.js (CLI) and React.js (browser) environments with intelligent caching.

## Features

- ✅ **Universal**: Works in Node.js and browser environments
- ✅ **Smart Caching**: File system (Node.js) or localStorage/sessionStorage (browser)
- ✅ **Performance**: Optimized matching with PrefixTrie algorithm
- ✅ **Case Sensitivity**: Proper God/god distinction (God→kt/god, god→kt/falsegod)
- ✅ **Morphological Variants**: Handles plurals, possessives, verb forms
- ✅ **Parentheses Normalization**: "Joseph (OT)" → "Joseph" for better coverage

---

## Usage

### CLI

Install globally:

```bash
npm install -g twl-generator
```

Generate a TWL TSV for a Bible book (downloads USFM from Door43):

```bash
twl-generator --book rut
```

Generate a TWL TSV from a local USFM file:

```bash
twl-generator --usfm ./myfile.usfm
```

Specify output file:

```bash
twl-generator --usfm ./myfile.usfm --output ./output.tsv
```

You can also combine `--book` and `--usfm` (book is used for output filename and context):

```bash
twl-generator --usfm ./myfile.usfm --book rut
```

---

### Keywords Dataset

Generate per-verse keywords with TW matches and lemmas (one JSON file per book). The output uses a flat keyed object per book: keys are `"C:V"` and values are ordered arrays of `{ surface, tw_match, lemma }` using the existing trie and term logic.

Command:

```bash
twl-generator keywords [options]
```

Options:

- `--books <ids>`: Comma-separated book ids (e.g., `gen,exo,mat`).
- `--testament <t>`: `old|new|all` (default: `all`).
- `--outdir <path>`: Output directory (default: `./keywords`).

Examples:

```bash
# Whole Bible, split per book
twl-generator keywords --outdir ./datasets

# Old Testament only
twl-generator keywords --testament old --outdir ./datasets

# Specific books
twl-generator keywords --books gen,exo,mat --outdir ./datasets
```

Per-book output shape (example):

```json
{
  "1:1": [
    { "surface": "God", "tw_match": "God", "lemma": "God" },
    { "surface": "created", "tw_match": "created", "lemma": "create" },
    { "surface": "heavens", "tw_match": "heavens", "lemma": "heaven" },
    { "surface": "earth", "tw_match": "earth", "lemma": "earth" }
  ],
  "1:2": [
    { "surface": "earth", "tw_match": "earth", "lemma": "earth" },
    { "surface": "Spirit", "tw_match": "Spirit", "lemma": "Spirit" },
    { "surface": "God", "tw_match": "God", "lemma": "God" }
  ]
}
```

Notes:

- The dataset uses canonical TW terms for `tw_match` and preserves the verse’s surface casing for `surface`. `lemma` is the primary term from the matched article’s heading (usually the base form).
- Multi-word terms and morphological variants are supported via the existing trie matcher.
- Files are named `keywords_<USFMBOOK>.json` (e.g., `keywords_GEN.json`).

### As a Library (Node.js/ESM/React)

Install as a dependency:

```bash
npm install twl-generator
```

#### Example: Generate TWL TSV from USFM string

```js
import { generateTWLWithUsfm } from 'twl-generator';

// USFM string (can be loaded from file, API, etc.)
const usfmContent = `
\\id MAT
\\c 1
\\v 1 In the beginning...
`;

const book = 'mat';

const tsv = await generateTWLWithUsfm(book, usfmContent);
// tsv is a string in TSV format, ready to save or process
console.log(tsv);
```

#### Example: Generate TWL TSV by fetching USFM for a book

```js
import { generateTWLWithUsfm } from 'twl-generator';

const book = 'rut'; // Book code

const tsv = await generateTWLWithUsfm(book);
// This will fetch the USFM for the book from Door43 and return the TSV string
console.log(tsv);
```

---

### API Reference

#### `generateTWLWithUsfm(book, usfmContent?)`

- `book`: (string) Book code (e.g., 'mat', 'rut'). Required if `usfmContent` is not provided.
- `usfmContent`: (string, optional) USFM file content. If provided, this is used instead of fetching from Door43.
- **Returns:** `Promise<string>` — TSV string of TWL matches.

---

## License

MIT
