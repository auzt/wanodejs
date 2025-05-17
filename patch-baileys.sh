#!/bin/bash
# Patch untuk mengatasi error logger.child is not a function

echo "Modifikasi file Baileys untuk menghapus dependensi pada logger.child"

# Temukan file-file yang menggunakan logger.child
find node_modules/@whiskeysockets/baileys -type f -name "*.js" -exec grep -l "logger.child" {} \;

# Buat backup file yang akan dimodifikasi
SOCKET_FILE="node_modules/@whiskeysockets/baileys/lib/Socket/socket.js"
if [ -f "$SOCKET_FILE" ]; then
  cp "$SOCKET_FILE" "$SOCKET_FILE.bak"
  echo "Backup $SOCKET_FILE dibuat"
  
  # Modifikasi file untuk memeriksa keberadaan child()
  sed -i 's/const logger = options.logger.child({ stream: "connection" })/const logger = typeof options.logger.child === "function" ? options.logger.child({ stream: "connection" }) : options.logger/g' "$SOCKET_FILE"
  echo "Modifikasi selesai: $SOCKET_FILE"
fi

# Buat patch untuk file utils/messages.js jika ada
MESSAGES_FILE="node_modules/@whiskeysockets/baileys/lib/Utils/messages.js"
if [ -f "$MESSAGES_FILE" ]; then
  cp "$MESSAGES_FILE" "$MESSAGES_FILE.bak"
  echo "Backup $MESSAGES_FILE dibuat"
  
  # Modifikasi file
  sed -i 's/const logger = options.logger.child({ stream: "messages" })/const logger = typeof options.logger.child === "function" ? options.logger.child({ stream: "messages" }) : options.logger/g' "$MESSAGES_FILE"
  echo "Modifikasi selesai: $MESSAGES_FILE"
fi

echo "Patch selesai"