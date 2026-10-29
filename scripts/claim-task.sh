#!/usr/bin/env bash
# Usage: ./scripts/claim-task.sh T01 pavel
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ID="${1:?task id, e.g. T01}"
NICK="${2:?your nick}"
BRANCH="agent/${NICK}/${ID}"

shopt -s nullglob
matches=("$ROOT/tasks/backlog/${ID}"*.md)
if ((${#matches[@]} == 0)); then
  echo "No backlog task matching ${ID}*.md" >&2
  exit 1
fi
if ((${#matches[@]} > 1)); then
  echo "Ambiguous id; matches:" "${matches[@]}" >&2
  exit 1
fi
src="${matches[0]}"
base="$(basename "$src")"
dest="$ROOT/tasks/in-progress/$base"

if [[ -f "$dest" ]]; then
  echo "Already in progress: $dest" >&2
  exit 1
fi

git mv "$src" "$dest" 2>/dev/null || mv "$src" "$dest"

echo "Claimed: $dest"
echo "Suggested branch: $BRANCH"
echo "Update frontmatter: status, claimed-by, branch, started"
echo "Then REQUIRED: git checkout -b $BRANCH && git add ... && git commit -m '${ID}: claim — задача в in-progress' && git push -u origin HEAD"
echo "See harness/COORDINATION.md — claim must be on remote before coding."
