#!/usr/bin/env sh
# Prints the latest release tag and exits 0 when <path> changed since it, 1 when it did not.
# Exits 0 with no output when nothing has been released yet.
# Usage: scripts/changed-since-release.sh <path>
last_tag=$(git describe --tags --abbrev=0 2>/dev/null) || exit 0
echo "$last_tag"
! git diff --quiet "$last_tag" HEAD -- "$1"
