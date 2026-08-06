#!/usr/bin/env bash
# First-time: auth (if needed), create GitHub repo, push code
set -euo pipefail
cd "$(dirname "$0")/.."

REPO_NAME="${1:-certificate-studio}"
VISIBILITY="${2:-public}" # public | private

if ! command -v gh >/dev/null; then
  echo "gh CLI غير موجود. ثبّته: https://cli.github.com/"
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "سجّل دخول GitHub (هيفتح متصفح أو يعطيك كود)..."
  gh auth login -h github.com -p https -w
fi

if [[ ! -d .git ]]; then
  git init -b main
fi

git add -A
if git diff --cached --quiet; then
  echo "لا يوجد شيء للـ commit (قد يكون تم مسبقاً)"
else
  git commit -m "$(cat <<'EOF'
Initial commit: Certificate Studio desktop app

Bulk certificate generator from Excel with project files,
preview, QR codes, and GitHub auto-update releases.
EOF
)"
fi

# Create remote if missing
if git remote get-url origin >/dev/null 2>&1; then
  echo "remote origin موجود: $(git remote get-url origin)"
else
  gh repo create "$REPO_NAME" --source=. --remote=origin "--$VISIBILITY" --description "Certificate Studio — شهادات تقدير بالجملة من Excel"
fi

git push -u origin HEAD

OWNER_REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
# Patch package.json repository field + build.publish
node -e "
const fs=require('fs');
const p=JSON.parse(fs.readFileSync('package.json','utf8'));
const full=process.argv[1];
const [owner,repo]=full.split('/');
p.repository={type:'git',url:\`https://github.com/\${full}.git\`};
p.build=p.build||{};
p.build.publish={provider:'github',owner,repo};
fs.writeFileSync('package.json', JSON.stringify(p,null,2)+'\n');
console.log('repo =', full);
" "$OWNER_REPO"

if [[ -n "$(git status --porcelain package.json)" ]]; then
  git add package.json
  git commit -m "chore: set GitHub repository metadata for auto-updates"
  git push origin HEAD
fi

echo ""
echo "========================================="
echo "المستودع: https://github.com/$OWNER_REPO"
echo "تحميل الأصدقاء (بعد أول release):"
echo "  https://github.com/$OWNER_REPO/releases/latest"
echo ""
echo "لنشر تحديث للأصدقاء:"
echo "  bash scripts/release.sh patch"
echo "========================================="
