#!/usr/bin/env node
import { generateTWLWithUsfm, generateTWTerms, processUsfmForBook, generateKeywordsForVerses } from './index.js';
import { getPrimaryByArticle } from './utils/zipProcessor.js';
import fs from 'fs';
import path from 'path';
import { BibleBookData } from './common/books.js';

const args = process.argv.slice(2);

const isKeywordsSubcommand = args[0] === 'keywords';

function printHelp() {
  console.log(`Usage: generate-twls [options]

Options:
  --book <book>           Specify the Bible book (e.g., rut)
  --usfm <path>          Path to USFM file to process
  --output <path>        Path to output TSV file
  --help                 Show this help message

Examples:
  generate-twls --book rut
  generate-twls --usfm ./41-MAT.usfm --output ./mat_twl.tsv
  generate-twls --usfm ./file.usfm --book rut`);
}

function printKeywordsHelp() {
  console.log(`Usage: twl-generator keywords [options]

Options:
  --books <ids>          Comma-separated book ids (e.g., gen,exo,mat)
  --testament <t>        Filter by testament: old|new|all (default: all)
  --outdir <path>        Output directory (default: ./keywords)
  --help                 Show this help message

Examples:
  twl-generator keywords
  twl-generator keywords --testament old --outdir ./keywords
  twl-generator keywords --books gen,exo,mat --outdir ./out`);
}

if (!isKeywordsSubcommand) {
  let book = null;
  let usfmPath = null;
  let outputPath = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--book' && args[i + 1]) {
      book = args[i + 1].toLowerCase();
      i++;
    } else if (args[i] === '--usfm' && args[i + 1]) {
      usfmPath = args[i + 1];
      i++;
    } else if (args[i] === '--output' && args[i + 1]) {
      outputPath = args[i + 1];
      i++;
    } else if (args[i] === '--help') {
      printHelp();
      process.exit(0);
    }
  }

  // Validate arguments
  if (!book && !usfmPath) {
    console.error('Error: Either --book or --usfm parameter is required');
    printHelp();
    process.exit(1);
  }

  if (usfmPath && !fs.existsSync(usfmPath)) {
    console.error(`Error: USFM file not found: ${usfmPath}`);
    process.exit(1);
  }

  (async () => {
    try {
      let usfmContent = null;
      if (usfmPath) {
        usfmContent = fs.readFileSync(usfmPath, 'utf8');
        console.log(`Reading USFM from: ${usfmPath}`);
      }

      const tsv = await generateTWLWithUsfm(book, usfmContent);

      // Determine output filename
      let filename;
      if (outputPath) {
        filename = outputPath;
      } else if (book) {
        filename = `twl_${book.toUpperCase()}.tsv`;
      } else if (usfmPath) {
        const baseName = path.basename(usfmPath, path.extname(usfmPath));
        filename = `${baseName}.tsv`;
      } else {
        filename = 'output.tsv';
      }

      // Save TSV to file
      fs.writeFileSync(filename, tsv, 'utf8');
      console.log(`TSV file saved as ${filename}`);
      console.log(`Found ${tsv.split('\n').length - 1} matches`);
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  })();
} else {
  // keywords subcommand
  let outdir = './keywords';
  let testament = 'all';
  let booksArg = null;

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--outdir' && args[i + 1]) {
      outdir = args[i + 1];
      i++;
    } else if (args[i] === '--testament' && args[i + 1]) {
      testament = args[i + 1].toLowerCase();
      i++;
    } else if (args[i] === '--books' && args[i + 1]) {
      booksArg = args[i + 1];
      i++;
    } else if (args[i] === '--help') {
      printKeywordsHelp();
      process.exit(0);
    }
  }

  function normalizeBookId(id) {
    return id.trim().toLowerCase();
  }

  function filterBooks() {
    let ids = Object.keys(BibleBookData);
    if (testament === 'old' || testament === 'new') {
      ids = ids.filter(id => BibleBookData[id].testament === testament);
    }
    if (booksArg) {
      const requested = new Set(booksArg.split(',').map(normalizeBookId));
      ids = ids.filter(id => requested.has(id));
      const missing = Array.from(requested).filter(x => !Object.prototype.hasOwnProperty.call(BibleBookData, x));
      if (missing.length) {
        console.warn(`Warning: unknown book ids ignored: ${missing.join(', ')}`);
      }
    }
    return ids;
  }

  (async () => {
    try {
      const ids = filterBooks();
      if (ids.length === 0) {
        console.error('No books selected.');
        process.exit(1);
      }

      // Ensure outdir exists
      fs.mkdirSync(outdir, { recursive: true });

      // Build terms once
      const terms = await generateTWTerms();
      const primaryByArticle = await getPrimaryByArticle();

      let processed = 0;
      for (const id of ids) {
        const bookData = BibleBookData[id];
        const usfmCode = bookData.usfm.split('-')[1]; // e.g., GEN
        console.log(`Processing ${bookData.title} (${id})...`);

        const verses = await processUsfmForBook(id);
        const dataset = generateKeywordsForVerses(terms, verses, primaryByArticle);

        const filename = path.join(outdir, `keywords_${usfmCode}.json`);
        fs.writeFileSync(filename, JSON.stringify(dataset, null, 2), 'utf8');
        console.log(`Wrote ${filename}`);

        processed++;
      }

      console.log(`Done. Generated ${processed} files in ${outdir}`);
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  })();
}
