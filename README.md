
# Kanban

To solve this, I used a  global event listener on document that listens every event lifecycle, one SQLite DB, and an HTTP server using Bun.

work: 
- Set attribute, Drag and Drop api of HTML5. Used dragstart, dragover, dragend, drop. Commonly pointer events `e.target` here for the pick, pack, pan and drop. 
- For reordering cards in column used float positining. Thought from the nth position eg. 100K-th position of card very common in terms of stock market or mail sorting. I defined three state for the picking card. This is about the `dom` part.
- To place card, used `getBoundingClientRect()` to get the exact size and location of elements on the screen. The state of card aka before and after. 

- For persistance used sqlite in which fractional Positioning Logic for p1-p2 position division and local storage and cache. This is memory and server-client communication part. The database response stored in a JavaScript object.

- Re-render the block after every shifting card. 

---

Other helper:
- POPUP: Edit and delete alert.
- HTTP API (create, update, patch, delete)

```bash
git clone https://github.com/cureerel/kanban.git && cd kanban && bun install && bun dev
````

<!--![Kanban Preview](preview.png)-->

I think this is the Kanban.

CUREEREL