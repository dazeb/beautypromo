#!/usr/bin/env bash
# Build and ship a new release to hermes-box (lumiere.dazeb.dev).
# Releases live in /opt/lumiere/releases/<stamp>; /opt/lumiere/current points at the live one.
# The database (/var/lib/lumiere) and secrets (/etc/lumiere/production.env) are never touched.
# Roll back: ssh hermes-box 'ln -sfn /opt/lumiere/releases/<older> /opt/lumiere/current && systemctl restart lumiere'
set -euo pipefail

HOST=${DEPLOY_HOST:-hermes-box}
URL=${DEPLOY_URL:-https://lumiere.dazeb.dev}
REL=$(date +%Y%m%d-%H%M%S)
TARBALL=$(mktemp --suffix=.tgz)
trap 'rm -f "$TARBALL"' EXIT

cd "$(dirname "$0")/.."
pnpm typecheck
pnpm build
tar czf "$TARBALL" package.json pnpm-lock.yaml dist server src/shared data/seed-offers.json data/seed-dates.json data/seed-retailers.json
scp -q "$TARBALL" "$HOST:/tmp/lumiere-$REL.tgz"

ssh "$HOST" "REL=$REL bash -s" <<'EOF'
set -euo pipefail
dir=/opt/lumiere/releases/$REL
install -d -m 755 "$dir"
tar xzf "/tmp/lumiere-$REL.tgz" -C "$dir" && rm "/tmp/lumiere-$REL.tgz"
cd "$dir"
# Copy, not hard-link: root's pnpm store is not readable by the lumiere user.
pnpm install --prod --frozen-lockfile --ignore-scripts --package-import-method=copy --reporter=silent
chown -R root:root . && chmod -R u+rwX,go+rX,go-w .
previous=$(readlink -f /opt/lumiere/current)
ln -sfn "$dir" /opt/lumiere/current
systemctl restart lumiere
for _ in $(seq 1 20); do curl -fs -o /dev/null http://127.0.0.1:8790/api/public && break; sleep 0.5; done
if ! curl -fs -o /dev/null http://127.0.0.1:8790/api/public; then
  echo "health check failed, rolling back to $previous" >&2
  ln -sfn "$previous" /opt/lumiere/current
  systemctl restart lumiere
  exit 1
fi
# Keep the three newest releases.
ls -1d /opt/lumiere/releases/* | sort | head -n -3 | xargs -r rm -rf
echo "live: $REL (previous: $(basename "$previous"))"
EOF

curl -fsL -o /dev/null -w "public: %{http_code} (%{url_effective})\n" "$URL/api/public"
