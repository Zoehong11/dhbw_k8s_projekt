import { useState } from "react";

export function CollectionsSidebar({ collections, selectedId, onSelect, onCreate, onDelete }) {
  const [newName, setNewName] = useState("");

  async function handleCreate(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    await onCreate(newName.trim());
    setNewName("");
  }

  return (
    <aside className="sidebar">
      <h2>Collections</h2>
      <ul className="collection-list">
        <li>
          <button className={selectedId === null ? "active" : ""} onClick={() => onSelect(null)}>
            All links
          </button>
        </li>
        {collections.map((c) => (
          <li key={c.id}>
            <button className={selectedId === c.id ? "active" : ""} onClick={() => onSelect(c.id)}>
              {c.name}
            </button>
            <button className="icon-button" title="Delete collection" onClick={() => onDelete(c.id)}>
              ×
            </button>
          </li>
        ))}
      </ul>
      <form className="new-collection" onSubmit={handleCreate}>
        <input
          placeholder="New collection…"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button type="submit">Add</button>
      </form>
    </aside>
  );
}
