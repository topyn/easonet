#!/bin/sh
# certbot deploy hook: copy the renewed certificate where the easonet-mx container (user `node`,
# uid 1000) can read it, then tell the server to reload it. Install with:
#   install -m 755 deploy/certbot-deploy-hook.sh /etc/letsencrypt/renewal-hooks/deploy/easonet-mx.sh
set -eu
# certbot sets RENEWED_LINEAGE; for the first manual run pass MX_HOSTNAME instead.
SRC="${RENEWED_LINEAGE:-/etc/letsencrypt/live/${MX_HOSTNAME:?set MX_HOSTNAME}}"
DST=/opt/easonet-mx/tls
install -d -m 700 -o 1000 -g 1000 "$DST"
install -m 600 -o 1000 -g 1000 "$SRC/fullchain.pem" "$DST/fullchain.pem"
install -m 600 -o 1000 -g 1000 "$SRC/privkey.pem" "$DST/privkey.pem"
docker kill -s HUP easonet-mx >/dev/null 2>&1 || true
