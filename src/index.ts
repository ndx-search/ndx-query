import { Index, InvertedIndexNode, DocumentPointer, findInvertedIndexNode } from "ndx";

/**
 * Query Result.
 */
export interface QueryResult<I> {
  /**
   * Document id.
   */
  readonly docId: I;
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
 * @typeparam I Document ID type.
 * @param index {@link DocumentIndex}.
 * @param fieldsBoost Fields boost factors.
 * @param bm25k1 BM25 ranking function constant `k1`, controls non-linear term frequency normalization (saturation).
 * @param bm25b BM25 ranking function constant `b`, controls to what degree document length normalizes tf values.
 * @param tokenizer Tokenizer is a function that breaks a text into words, phrases, symbols, or other meaningful
 *  elements called tokens.
 * @param filter Filter is a function that processes tokens and returns terms, terms are used in Inverted Index to index
 *  documents.
 * @param removed Set of removed document ids.
 * @param s Query string.
 * @returns Array of {@link QueryResult} objects.
 */
export function query<I>(
  index: Index<I>,
  fieldsBoost: number[],
  bm25k1: number,
  bm25b: number,
  tokenizer: (s: string) => string[],
  filter: (s: string) => string,
  removed: Set<I> | undefined,
  s: string,
): QueryResult<I>[] {
  const { documents, root, fields } = index;
  const terms = tokenizer(s);
  const scores = new Map<I, number>();

  for (let i = 0; i < terms.length; i++) {
    const term = filter(terms[i]);
    if (term !== "") {
      const expandedTerms = expandTerm(index, term);
      const visitedDocuments = new Set<I>();
      for (let j = 0; j < expandedTerms.length; j++) {
        const eTerm = expandedTerms[j];
        const expansionBoost = eTerm === term ? 1 : Math.log(1 + (1 / (1 + eTerm.length - term.length)));
        const termNode = findInvertedIndexNode(root, eTerm);

        if (termNode !== void 0 && termNode.firstPosting !== null) {
          let documentFrequency = 0;
          let pointer: DocumentPointer<I> | null = termNode.firstPosting;
          let prevPointer: DocumentPointer<I> | null = null;

          while (pointer !== null) {
            if (removed !== void 0 && removed.has(pointer.details.id)) {
              if (prevPointer === null) {
                termNode.firstPosting = pointer.next;
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
            const idf = Math.log(1 + (documents.size - documentFrequency + 0.5) / (documentFrequency + 0.5));

            pointer = termNode.firstPosting;
            while (pointer !== null) {
              if (removed === void 0 || !removed.has(pointer.details.id)) {
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
                  const id = pointer.details.id;
                  const prevScore = scores.get(id);
                  if (prevScore !== void 0 && visitedDocuments.has(id)) {
                    scores.set(id, Math.max(prevScore, score));
                  } else {
                    scores.set(id, prevScore === void 0 ? score : prevScore + score);
                  }
                  visitedDocuments.add(id);
                }
              }
              pointer = pointer.next;
            }
          }
        }
      }
    }
  }

  const result = [] as QueryResult<I>[];
  scores.forEach((score, docId) => {
    result.push({ docId, score });
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
  if (node.firstPosting !== null) {
    results.push(term);
  }
  let child = node.firstChild;
  while (child !== null) {
    _expandTerm(child, results, term + String.fromCharCode(child.charCode));
    child = child.next;
  }
}
