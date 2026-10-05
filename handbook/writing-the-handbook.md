# Writing the handbook

This handbook lives in the `handbook/` folder of the repository. Compodoc adds it to the API
documentation as additional documentation, so both are published together in `docs/api`.

## Files

- `handbook/summary.json`: the table of contents. Each entry has a `title`, a `file` (relative
  to `handbook/`) and, optionally, `children` with the same shape.
- `handbook/*.md`: one Markdown file for each chapter.

## Adding a chapter

1. Create the Markdown file in `handbook/`. Start it with a level-one heading.
2. Add an entry to `summary.json`, in the position where it should appear in the menu.
3. Run `npm run docs` and open `docs/api/index.html` to check the result.

## Links between chapters

Compodoc writes each chapter to `docs/api/additional-documentation/` and builds the file
name from the **title** in `summary.json`, not from the Markdown file name: the title is
converted to lower case and spaces become hyphens. For example, the chapter titled
"Models and collections" is published as `models-and-collections.html`.

Link to other chapters with that name: `[Caching](caching.html)`. Links to children use the
parent folder: `parent-title/child-title.html`.

## Conventions

- Write in English, in short sentences and in the present tense.
- Check examples against the source code and the specs. Prefer examples that the specs
  already test.
- Describe usage in the handbook. Describe signatures in the JSDoc of the source code, which
  compodoc publishes in the API reference.
