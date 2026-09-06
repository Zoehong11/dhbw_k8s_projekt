import { useEffect, useState, useCallback } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { CollectionsSidebar } from "./CollectionsSidebar";
import { AddLinkForm } from "./AddLinkForm";
import { LinkList } from "./LinkList";

export function MainApp() {
  const { logout } = useAuth();
  const [collections, setCollections] = useState([]);
  const [links, setLinks] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const refreshCollections = useCallback(async () => {
    setCollections(await api.listCollections());
  }, []);

  const refreshLinks = useCallback(async () => {
    setLinks(await api.listLinks({ collection_id: selectedCollection ?? undefined, q: search || undefined }));
  }, [selectedCollection, search]);

  useEffect(() => {
    setLoading(true);
    Promise.all([refreshCollections(), refreshLinks()]).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => refreshLinks(), 250);
    return () => clearTimeout(timeout);
  }, [refreshLinks]);

  async function handleAddLink(url) {
    await api.createLink(url, selectedCollection ?? undefined);
    await refreshLinks();
  }

  async function handleCreateCollection(name) {
    await api.createCollection(name);
    await refreshCollections();
  }

  async function handleDeleteCollection(id) {
    await api.deleteCollection(id);
    if (selectedCollection === id) setSelectedCollection(null);
    await refreshCollections();
    await refreshLinks();
  }

  async function handleDeleteLink(id) {
    await api.deleteLink(id);
    await refreshLinks();
  }

  async function handleMoveLink(id, collectionId) {
    await api.updateLink(id, { collection_id: collectionId });
    await refreshLinks();
  }

  return (
    <div className="app-shell">
      <CollectionsSidebar
        collections={collections}
        selectedId={selectedCollection}
        onSelect={setSelectedCollection}
        onCreate={handleCreateCollection}
        onDelete={handleDeleteCollection}
      />
      <main className="main-panel">
        <header className="main-header">
          <h1>{selectedCollection ? collections.find((c) => c.id === selectedCollection)?.name : "All links"}</h1>
          <button className="logout-button" onClick={logout}>
            Sign out
          </button>
        </header>
        <AddLinkForm onAdd={handleAddLink} />
        <input
          className="search-input"
          placeholder="Search title, journal, url…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {loading ? (
          <p className="empty-state">Loading…</p>
        ) : (
          <LinkList links={links} collections={collections} onDelete={handleDeleteLink} onMove={handleMoveLink} />
        )}
      </main>
    </div>
  );
}
