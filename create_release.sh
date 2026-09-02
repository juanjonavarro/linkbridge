#!/bin/bash

set -euo pipefail

if [ "$#" -lt 1 ] || [ -z "$1" ]; then
  echo "Usage: $0 <version>"
  exit 1
fi

VERSION="$1"
ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

# Build the project
npm --prefix "$ROOT_DIR" run build

# Zip the project with the cross-browser manifest.
(cd "$ROOT_DIR/dist" && zip -rv "$ROOT_DIR/versions/linkbridge_${VERSION}.zip" *)

# Edge's Manifest V3 store validator rejects background.scripts, Build the
# Edge package with a temporary manifest so the regular package remains unchanged.
EDGE_WORK_DIR="$(mktemp -d)"
EDGE_MANIFEST="$EDGE_WORK_DIR/manifest.json"
trap 'rm -f -- "$EDGE_MANIFEST"; rmdir -- "$EDGE_WORK_DIR"' EXIT

node --input-type=module -e '
import fs from "node:fs";

const [sourcePath, targetPath] = process.argv.slice(1);
const manifest = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
delete manifest.background.scripts;
fs.writeFileSync(targetPath, JSON.stringify(manifest, null, 2) + "\n");
' "$ROOT_DIR/dist/manifest.json" "$EDGE_MANIFEST"

(cd "$ROOT_DIR/dist" && zip -rv \
  "$ROOT_DIR/versions/linkbridge_${VERSION}_edge.zip" * -x manifest.json)
(cd "$EDGE_WORK_DIR" && zip -rv \
  "$ROOT_DIR/versions/linkbridge_${VERSION}_edge.zip" *)
