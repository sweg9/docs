# Papers

| Paper | Description |
|---|---|
| [Proposal](./proposal) | Vision-Based Recognition and Actuation of Unconnected Home Controls. Motivation, client needs, related software, requirements, development environment and specifications (IEEE format, 8 pages). This is the reference document for the whole wiki |

## Add a paper

1. Put the PDF at `public/papers/<name>.pdf`.
2. Create `papers/<name>.md` with the viewer:

   ```md
   <PdfViewer src="/papers/<name>.pdf" title="Paper title" />
   ```

3. Add a row above and a sidebar item in `.vitepress/config.mts`.
