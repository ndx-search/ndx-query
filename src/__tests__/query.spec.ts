import { createIndex } from "ndx";
import { addDocumentToIndex, removeDocumentFromIndex } from "ndx-index";
import { query } from "..";

const tokenizer = (s: string) => s.split(" ");
const filter = (s: string) => s;

test("should return document 1", () => {
  const idx = createIndex(2);
  const docs = [
    { id: 1, title: "a b c", text: "hello world" },
    { id: 2, title: "c d e", text: "lorem ipsum" },
  ];
  docs.forEach((doc) => {
    addDocumentToIndex(idx, [(d) => d.title, (d) => d.text], tokenizer, filter, doc.id, doc);
  });
  expect(query(idx, [1, 1], 1.2, 0.75, tokenizer, filter, void 0, "a")).toMatchSnapshot();
});

test("should return document 1 and 2", () => {
  const idx = createIndex(2);
  const docs = [
    { id: 1, title: "a b c", text: "hello world" },
    { id: 2, title: "c d e", text: "lorem ipsum" },
  ];
  docs.forEach((doc) => {
    addDocumentToIndex(idx, [(d) => d.title, (d) => d.text], tokenizer, filter, doc.id, doc);
  });
  expect(query(idx, [1, 1], 1.2, 0.75, tokenizer, filter, void 0, "c")).toMatchSnapshot();
});

test("should automatically try to expand terms", () => {
  const idx = createIndex(2);
  const docs = [
    { id: 1, title: "a b c", text: "hello world" },
    { id: 2, title: "c d e", text: "lorem ipsum" },
  ];
  docs.forEach((doc) => {
    addDocumentToIndex(idx, [(d) => d.title, (d) => d.text], tokenizer, filter, doc.id, doc);
  });
  expect(query(idx, [1, 1], 1.2, 0.75, tokenizer, filter, void 0, "h")).toMatchSnapshot();
});

test("should ignore removed documents", () => {
  const idx = createIndex(2);
  const removed = new Set();
  const docs = [
    { id: 1, title: "a b c", text: "hello world" },
    { id: 2, title: "c d e", text: "lorem ipsum" },
  ];
  docs.forEach((doc) => {
    addDocumentToIndex(idx, [(d) => d.title, (d) => d.text], tokenizer, filter, doc.id, doc);
  });
  removeDocumentFromIndex(idx, removed, 1);
  expect(query(idx, [1, 1], 1.2, 0.75, tokenizer, filter, removed, "a")).toEqual([]);
});

test("should ignore empty terms in the query", () => {
  const idx = createIndex(2);
  const removed = new Set();
  const docs = [
    { id: 1, title: "a b c", text: "hello world" },
    { id: 2, title: "c d e", text: "lorem ipsum" },
  ];
  docs.forEach((doc) => {
    addDocumentToIndex(idx, [(d) => d.title, (d) => d.text], tokenizer, filter, doc.id, doc);
  });
  removeDocumentFromIndex(idx, removed, 1);
  expect(query(idx, [1, 1], 1.2, 0.75, tokenizer, (t) => t === "a" ? "" : filter(t), removed, "a")).toEqual([]);
});

test("should use token separator as disjunction operator", () => {
  const idx = createIndex(2);
  const docs = [
    { id: 1, title: "a b c", text: "hello world" },
    { id: 2, title: "c d e", text: "lorem ipsum" },
  ];
  docs.forEach((doc) => {
    addDocumentToIndex(idx, [(d) => d.title, (d) => d.text], tokenizer, filter, doc.id, doc);
  });
  expect(query(idx, [1, 1], 1.2, 0.75, tokenizer, filter, void 0, "a d")).toMatchSnapshot();
});
