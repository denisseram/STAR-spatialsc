#!/bin/bash

# Cambia estas variables según tu setup
BUCKET="star"
LOCAL_DIR="./public/data/images"

# ==============================
# Verificación de wrangler login
# ==============================
if ! wrangler whoami &>/dev/null; then
    echo "No estás autenticada con wrangler. Ejecuta primero: wrangler login"
    exit 1
fi

# ==============================
# Subida de archivos
# ==============================
find "$LOCAL_DIR" -type f | while read FILE; do
    # Obtiene la ruta relativa para mantener la estructura
    REL_PATH="${FILE#$LOCAL_DIR/}"

    # Prepara la ruta final dentro del bucket con "images/" al inicio
    BUCKET_PATH="images/$REL_PATH"

    # Detecta el MIME type automáticamente (opcional)
    MIME_TYPE=$(file --mime-type -b "$FILE")

    echo "Subiendo $FILE -> $BUCKET/$BUCKET_PATH (Content-Type: $MIME_TYPE)"

    wrangler r2 object put "$BUCKET/$BUCKET_PATH" --file "$FILE" --content-type "$MIME_TYPE" --remote
done
  