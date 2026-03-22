#!/bin/bash
# compile_all.sh
# Compile all refactored LaTeX templates in the template_refactor directory.

BASE_DIR="/home/zdong/lawCode/template_refactor"
cd "$BASE_DIR" || exit 1

# Find all directories that start with a zero and have numbers (e.g. 053_...)
DIRS=$(find . -maxdepth 1 -type d -name "0*" | sort)

SUCCESS=0
FAIL=0

echo "Starting compilation of refactored templates..."

for dir in $DIRS; do
    # Go into the directory
    cd "$BASE_DIR/$dir" || continue
    
    # Find the tex file
    TEX_FILE=$(ls *.tex 2>/dev/null)
    if [ -z "$TEX_FILE" ]; then
        cd "$BASE_DIR"
        continue
    fi
    
    echo "----------------------------------------"
    echo "Compiling: $TEX_FILE"
    
    # Compile with xelatex
    # Run twice for cross-references if necessary, but once is usually enough for these templates
    xelatex -interaction=nonstopmode -halt-on-error "$TEX_FILE" > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo "✅ SUCCESS: $TEX_FILE"
        SUCCESS=$((SUCCESS+1))
    else
        echo "❌ FAILED: $TEX_FILE"
        # Print the last few lines of log to help debug
        tail -n 20 "${TEX_FILE%.tex}.log" 2>/dev/null
        FAIL=$((FAIL+1))
    fi
    
    cd "$BASE_DIR"
done

echo "========================================"
echo "Compilation Summary"
echo "✅ Successful: $SUCCESS"
echo "❌ Failed: $FAIL"
echo "========================================"

if [ "$FAIL" -gt 0 ]; then
    exit 1
else
    exit 0
fi
