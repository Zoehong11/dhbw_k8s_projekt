import { useState } from "react";

export function AddLinkForm({ onAdd }) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!url.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await onAdd(url.trim());
      setUrl("");
    } catch (err) {
      setError(err.message ?? "Could not save this link");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="add-link-form" onSubmit={handleSubmit}>
      <input
        type="url"
        placeholder="Paste a link…"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        required
      />
      <button type="submit" disabled={busy}>
        {busy ? "Fetching metadata…" : "Save"}
      </button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}
