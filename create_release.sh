#!/bin/bash

if [ -z "$1" ]; then
  echo "Usage: $0 <version>"
  exit 1
fi

VERSION=$1

# Build the project
npm run build

# Zip the project
(cd dist && zip -rv ../versions/linkbridge_$VERSION.zip *)