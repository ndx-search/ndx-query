import { Index, InvertedIndexNode, DocumentPointer, findInvertedIndexNode } from "ndx";

/**
 * Query Result.
 *
 * @typeparam T Document key.
 */
export interface QueryResult<I> {
  /**
   * Document key.
   */
  readonly key: I;
  /**
   * Result score.
   */
  readonly score: number;
}

/**
 * Performs a search with a simple free text query.
 *
 * All token separators work as a disjunction operator.
 *
 * @typeparam T Document key.
 * @param index {@link DocumentIndex}.
 * @param fieldsBoost Fields boost factors.
 * @param bm25k1 BM25 ranking function constant `k1`, controls non-linear term frequency normalization (saturation).
 * @param bm25b BM25 ranking function constant `b`, controls to what degree document length normalizes tf values.
 * @param tokenizer Tokenizer is a function that breaks a text into words, phrases, symbols, or other meaningful
 *  elements called tokens.
 * @param filter Filter is a function that processes tokens and returns terms, terms are used in Inverted Index to index
 *  documents.
 * @param removed Set of removed document keys.
 * @param s Query string.
 * @returns Array of {@link QueryResult} objects.
 */
export function query<T>(
  index: Index<T>,
  fieldsBoost: number[],
  bm25k1: number,
  bm25b: number,
  tokenizer: (s: string) => string[],
  filter: (s: string) => string,
  removed: Set<T> | undefined,
  s: string,
): QueryResult<T>[] {
  const { docs, root, fields } = index;
  const terms = tokenizer(s);
  const scores = new Map<T, number>();

  for (let i = 0; i < terms.length; i++) {
    const term = filter(terms[i]);
    if (term !== "") {
      const expandedTerms = expandTerm(index, term);
      const visitedDocuments = new Set<T>();
      for (let j = 0; j < expandedTerms.length; j++) {
        const eTerm = expandedTerms[j];
        const expansionBoost = eTerm === term ? 1 : Math.log(1 + (1 / (1 + eTerm.length - term.length)));
        const termNode = findInvertedIndexNode(root, eTerm);

        if (termNode !== void 0 && termNode.firstDoc !== null) {
          let documentFrequency = 0;
          let pointer: DocumentPointer<T> | null = termNode.firstDoc;
          let prevPointer: DocumentPointer<T> | null = null;

          while (pointer !== null) {
            if (removed !== void 0 && removed.has(pointer.details.key)) {
              if (prevPointer === null) {
                termNode.firstDoc = pointer.next;
              } else {
                prevPointer.next = pointer.next;
              }
            } else {
              prevPointer = pointer;
              documentFrequency++;
            }
            pointer = pointer.next;
          }

          if (documentFrequency > 0) {
            // calculating BM25 idf
            const idf = Math.log(1 + (docs.size - documentFrequency + 0.5) / (documentFrequency + 0.5));

            pointer = termNode.firstDoc;
            while (pointer !== null) {
              if (removed === void 0 || !removed.has(pointer.details.key)) {
                let score = 0;
                for (let x = 0; x < pointer.details.fieldLengths.length; x++) {
                  let tf = pointer.termFrequency[x];
                  if (tf > 0) {
                    // calculating BM25 tf
                    const fieldLength = pointer.details.fieldLengths[x];
                    const fieldDetails = fields[x];
                    const avgFieldLength = fieldDetails.avg;
                    tf = ((bm25k1 + 1) * tf) / (bm25k1 * ((1 - bm25b) + bm25b * (fieldLength / avgFieldLength)) + tf);
                    score += tf * idf * fieldsBoost[x] * expansionBoost;
                  }
                }
                if (score > 0) {
                  const key = pointer.details.key;
                  const prevScore = scores.get(key);
                  if (prevScore !== void 0 && visitedDocuments.has(key)) {
                    scores.set(key, Math.max(prevScore, score));
                  } else {
                    scores.set(key, prevScore === void 0 ? score : prevScore + score);
                  }
                  visitedDocuments.add(key);
                }
              }
              pointer = pointer.next;
            }
          }
        }
      }
    }
  }

  const result = [] as QueryResult<T>[];
  scores.forEach((score, key) => {
    result.push({ key, score });
  });
  result.sort((a, b) => b.score - a.score);

  return result;
}

/**
 * Expands term with all possible combinations.
 *
 * @typeparam I Document ID type.
 * @param index {@link DocumentIndex}
 * @param term Term.
 * @returns All terms that starts with `term` string.
 */
export function expandTerm<I>(index: Index<I>, term: string): string[] {
  const node = findInvertedIndexNode(index.root, term);
  const results = [] as string[];
  if (node !== void 0) {
    _expandTerm(node, results, term);
  }

  return results;
}

/**
 * Recursively goes through inverted index nodes and expands term with all possible combinations.
 *
 * @typeparam I Document ID type.
 * @param index {@link Index}
 * @param results Results.
 * @param term Term.
 */
function _expandTerm<I>(node: InvertedIndexNode<I>, results: string[], term: string): void {
  if (node.firstDoc !== null) {
    results.push(term);
  }
  let child = node.firstChild;
  while (child !== null) {
    _expandTerm(child, results, term + String.fromCharCode(child.charCode));
    child = child.next;
  }
}
