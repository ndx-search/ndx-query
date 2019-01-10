# [ndx](https://github.com/ndx-search/ndx-query) &middot; [![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/ndx-search/ndx-query/blob/master/LICENSE) [![npm version](https://img.shields.io/npm/v/ndx-query.svg)](https://www.npmjs.com/package/ndx-query) [![codecov](https://codecov.io/gh/ndx-search/ndx-query/branch/master/graph/badge.svg)](https://codecov.io/gh/ndx-search/ndx-query) [![CircleCI Status](https://circleci.com/gh/ndx-search/ndx-query.svg?style=shield&circle-token=:circle-token)](https://circleci.com/gh/ndx-search/ndx-query) [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/ndx-search/ndx-query)

Query functions for a lightweight javascript (TypeScript) full-text indexing and searching library
[ndx](https://github.com/ndx-search/ndx-query).

## Documentation

### Perform a Query

```ts
function query<I>(
  index: Index<I>,
  fieldsBoost: number[],
  bm25k1: number,
  bm25b: number,
  tokenizer: (s: string) => string[],
  filter: (s: string) => string,
  removed: Set<I> | undefined,
  s: string,
): QueryResult<I>[];

interface QueryResult<I> {
  readonly docId: I;
  readonly score: number;
}
```

#### Example

```ts
import { createIndex } from "ndx";
import { addDocumentToIndex } from "ndx-index";
import { query } from "ndx-query";

const index = createIndex(2);
const tokenizer = (s: string) => s.split(" ");
const filter = (s: string) => s;
function add(d) {
  addDocumentToIndex(
    index,
    [
      (d) => d.title,
      (d) => d.text,
    ],
    t,
    filter,
    d.id,
    d,
  );
}
function search(q) {
  return query(
    index,
    [1, 1], // Fields boosting factors
    1.2,    // BM25 k1
    0.75,   // BM25 b
    tokenizer,
    filter,
    undefined, // Don't use set of removed documents
    q,
  );
}

const doc = {
  id: 1,
  title: "Title"
  text: "text",
};

add(doc);
query("text");
```

### Expand Term

```ts
function expandTerm<I>(index: Index<I>, term: string): string[];
```
