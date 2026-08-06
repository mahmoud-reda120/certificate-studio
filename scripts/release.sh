#!/usr/bin/env bash
# Bump version, push, and create git tag → GitHub Actions builds installers for friends.
set -euo pipefail
cd "$(dirname "$0")/.."

BUMP="${1:-patch}" # patch | minor | major

if [[ -n "$(git status --porcelain)" ]]; then
  echo "في تغييرات غير محفوظة. اعمل commit أولاً أو stash."
  git status -sb
  exit 1
fi

npm version "$BUMP" -m "release: v%s"
git push origin HEAD
git push origin --tags
echo ""
echo "تم الرفع. Actions هتبني النسخة: https://github.com/$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo 'OWNER/certificate-studio')/actions"
echo "بعد ما تخلص، لينك التحميل: .../releases/latest"
