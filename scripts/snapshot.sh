#!/bin/bash

# =================================
# Manual Snapshot Script
# =================================
# Run this script to create a manual snapshot/backup
# Usage: ./scripts/snapshot.sh [optional message]

set -e

DATE=$(date +'%Y-%m-%d_%H-%M-%S')
MESSAGE=${1:-"Manual snapshot"}

echo "📸 Creating snapshot at $DATE..."

# Check if there are changes
if [ -n "$(git status --porcelain)" ]; then
    git add -A
    git commit -m "📸 $MESSAGE: $DATE"
    
    echo "✅ Snapshot created successfully!"
    echo ""
    echo "To push to GitHub:"
    echo "  git push origin main"
    echo ""
    echo "To create a tag:"
    echo "  git tag -a snapshot-$DATE -m 'Snapshot $DATE'"
    echo "  git push origin snapshot-$DATE"
else
    echo "ℹ️  No changes detected. Nothing to snapshot."
fi
