#!/bin/bash

set -euo pipefail

exec /home/gil/Repositories/pubky/scripts/start-pubky-dev.sh \
  --session eventky-dev \
  --apps eventky \
  --attach
