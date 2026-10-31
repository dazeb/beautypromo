#!/usr/bin/env bash
# Put the site on its own domain once the domain is registered and its nameservers point at Cloudflare.
# The Cloudflare zone and DNS records (A -> hermes-box, www CNAME, no-mail SPF/DMARC/DKIM) already exist.
#
# Two phases, so a certificate failure never breaks the working address:
#   1. serve $DOMAIN and www.$DOMAIN alongside lumiere.dazeb.dev, wait for their certificates;
#   2. only then turn www.$DOMAIN and lumiere.dazeb.dev into permanent redirects to $DOMAIN.
# The Caddyfile is backed up first and restored if anything fails. Safe to re-run.
set -euo pipefail

DOMAIN=${1:-beautypromos.deals}
OLD=lumiere.dazeb.dev
HOST=${DEPLOY_HOST:-hermes-box}
IP=178.104.6.193

ns=$(dig +short NS "$DOMAIN" @1.1.1.1 | sort | tr '\n' ' ')
a=$(dig +short A "$DOMAIN" @1.1.1.1 | head -1)
if [[ "$a" != "$IP" ]]; then
  echo "$DOMAIN doesn't resolve to hermes-box yet (A: ${a:-none}, NS: ${ns:-none})." >&2
  echo "Register it, set its nameservers to colette.ns.cloudflare.com and scott.ns.cloudflare.com, then re-run." >&2
  exit 1
fi
echo "DNS ok: $DOMAIN -> $a (NS: $ns)"

ssh "$HOST" "DOMAIN=$DOMAIN OLD=$OLD bash -s" <<'EOF'
set -euo pipefail
set -a; . /etc/caddy/cloudflare.env; set +a
CF=/etc/caddy/Caddyfile
backup=$CF.bak.$DOMAIN-$(date +%Y%m%d-%H%M%S)
cp -p "$CF" "$backup"
restore() { echo "failed, restoring $backup" >&2; cp -p "$backup" "$CF"; systemctl reload caddy; exit 1; }

# Phase 1: the old address keeps serving; the new names are added to the same site block.
if ! grep -q "^$DOMAIN" "$CF"; then
  sed -i "s/^$OLD {\$/$DOMAIN, www.$DOMAIN, $OLD {/" "$CF"
  grep -q "^$DOMAIN, www.$DOMAIN, $OLD {\$" "$CF" || restore
  caddy validate --config "$CF" --adapter caddyfile >/dev/null 2>&1 || restore
  systemctl reload caddy
fi
for _ in $(seq 1 36); do
  curl -fsS -o /dev/null "https://$DOMAIN/api/public" 2>/dev/null && curl -fsS -o /dev/null "https://www.$DOMAIN/api/public" 2>/dev/null && break
  sleep 5
done
curl -fsS -o /dev/null "https://$DOMAIN/api/public" || restore
echo "phase 1: https://$DOMAIN serves with a valid certificate"

# Phase 2: one canonical address; www and the old name redirect to it (same pattern as undercut.deals).
if ! grep -q "^www.$DOMAIN, $OLD {\$" "$CF"; then
  sed -i "s/^$DOMAIN, www.$DOMAIN, $OLD {\$/$DOMAIN {/" "$CF"
  printf '\nwww.%s, %s {\n    redir https://%s{uri} permanent\n}\n' "$DOMAIN" "$OLD" "$DOMAIN" >> "$CF"
  caddy validate --config "$CF" --adapter caddyfile >/dev/null 2>&1 || restore
  systemctl reload caddy
fi
sleep 2
for u in "https://www.$DOMAIN/" "https://$OLD/"; do
  [[ "$(curl -s -o /dev/null -w '%{redirect_url}' "$u")" == "https://$DOMAIN/" ]] || restore
done
curl -fsS -o /dev/null "https://$DOMAIN/" || restore
echo "phase 2: www.$DOMAIN and $OLD redirect to https://$DOMAIN (backup: $backup)"
EOF
