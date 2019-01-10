import { createIndex } from "ndx";
import { addDocumentToIndex } from "ndx-index";
import { expandTerm } from "..";

const tokenizer = (s: string) => s.split(" ");
const filter = (s: string) => s;

test("should expand term with all combinations", () => {
  const idx = createIndex(2);
  const docs = [
    { id: 1, title: "abc def", text: "hello world" },
    { id: 2, title: "adef abc", text: "lorem ipsum" },
  ];
  docs.forEach((doc) => {
    addDocumentToIndex(idx, [(d) => d.title, (d) => d.text], tokenizer, filter, doc.id, doc);
  });
  expect(expandTerm(idx, "a")).toEqual(["adef", "abc"]);
});

test("should return empty arrary when there are no possible term expansions", () => {
  const idx = createIndex(2);
  const docs = [
    { id: 1, title: "abc def", text: "hello world" },
    { id: 2, title: "adef abc", text: "lorem ipsum" },
  ];
  docs.forEach((doc) => {
    addDocumentToIndex(idx, [(d) => d.title, (d) => d.text], tokenizer, filter, doc.id, doc);
  });
  expect(expandTerm(idx, "x")).toEqual([]);
});
