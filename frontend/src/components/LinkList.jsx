export function LinkList({ links, collections, onDelete, onMove }) {
  if (links.length === 0) {
    return <p className="empty-state">No links yet.</p>;
  }

  return (
    <ul className="link-list">
      {links.map((link) => (
        <li key={link.id} className="link-card">
          <div className="link-main">
            <a href={link.url} target="_blank" rel="noreferrer" className="link-title">
              {link.title || link.url}
            </a>
            <div className="link-meta">
              {link.authors?.length ? <span>{link.authors.join(", ")}</span> : null}
              {link.journal ? <span>{link.journal}</span> : null}
              {link.publisher ? <span>{link.publisher}</span> : null}
              {link.year ? <span>{link.year}</span> : null}
            </div>
            <a href={link.url} target="_blank" rel="noreferrer" className="link-url">
              {link.url}
            </a>
          </div>
          <div className="link-actions">
            <select
              value={link.collection_id ?? ""}
              onChange={(e) => onMove(link.id, e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">No collection</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button className="icon-button" title="Delete link" onClick={() => onDelete(link.id)}>
              ×
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
