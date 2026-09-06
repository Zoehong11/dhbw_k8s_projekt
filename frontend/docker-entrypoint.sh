#!/bin/sh
set -eu

cat > /usr/share/nginx/html/env-config.js <<EOF
window.__ENV__ = {
  API_URL: "${API_URL:-}"
};
EOF
