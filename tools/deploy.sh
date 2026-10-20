#!/bin/bash
# Copy Translit to the stuffs site (stuffs.tiresia.xyz/translit/).
set -euo pipefail
cd "$(dirname "$0")/.."
rsync -a --delete app/ /srv/docker/stuffs/site/translit/
echo "Live at https://stuffs.tiresia.xyz/translit/"
