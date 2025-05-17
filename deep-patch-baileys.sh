#!/bin/bash
# Patch massal untuk semua file yang menggunakan logger.child

echo "Starting deep patch of Baileys logger.child..."

# Create backup directory
mkdir -p baileys-backup

# Find all JS files in the Baileys package
find node_modules/@whiskeysockets/baileys -type f -name "*.js" > baileys-files.txt

# Backup all files
echo "Creating backups..."
while IFS= read -r file; do
  cp "$file" "baileys-backup/$(basename "$file")"
done < baileys-files.txt

# Find files that use logger.child
echo "Finding files with logger.child..."
grep -l "logger.child" node_modules/@whiskeysockets/baileys/lib/**/*.js > baileys-child-files.txt

# Apply patches to each file
echo "Applying patches..."
while IFS= read -r file; do
  echo "Patching $file"
  
  # Replace direct child calls with conditional ones
  sed -i 's/\(const\|let\|var\)\s\+logger\s*=\s*options\.logger\.child/\1 logger = typeof options.logger.child === "function" ? options.logger.child/g' "$file"
  
  # Add fallback for other uses of child
  sed -i 's/logger\.child/typeof logger.child === "function" ? logger.child : function(o) { return logger; }/g' "$file"
done < baileys-child-files.txt

echo "Patch complete. Original files backed up to baileys-backup/"
echo "If you need to restore: cp baileys-backup/* node_modules/@whiskeysockets/baileys/lib/"