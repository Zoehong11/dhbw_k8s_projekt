// Local-dev default. In the container this file is regenerated at startup
// from the API_URL environment variable (see docker-entrypoint.sh), so the
// same built image can be pointed at any backend without a rebuild.
window.__ENV__ = {
  API_URL: "http://localhost:8000",
};
