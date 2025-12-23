#!/bin/bash

verify_dir() {
    pwd_current=$(pwd)
    
    echo -e "\n🔍 Verifying environment:"
    echo "Location: $pwd_current"
    
    # Define required files based on directory using : as delimiter
    required_files=""
    if [ "$pwd_current" = "/Users/robertblackwell/firebase-csv-import/functions" ]; then
        required_files="index.js:package.json:node_modules:security.js"
    elif [ "$pwd_current" = "/Users/robertblackwell/firebase-csv-import" ]; then
        required_files="functions:.git:index.html"
    else
        echo "❌ Unknown directory: $pwd_current"
        return 1
    fi
    
    # Split the required files string on : and verify each
    echo "Required files:"
    verification_failed=0
    OLDIFS=$IFS
    IFS=":"
    for f in $required_files; do
        printf "  - %-20s" "$f"
        if [ -e "$f" ]; then
            echo "✅"
        else
            echo "❌"
            verification_failed=1
        fi
    done
    IFS=$OLDIFS
    
    if [ $verification_failed -eq 0 ]; then
        echo "✅ All required files present"
        echo "Directory contents:"
        ls -la
    else
        echo "❌ Some required files are missing"
    fi
    echo "------------------------"
    return $verification_failed
}

goto_dir() {
    target_dir="$1"
    echo "🚀 Moving to: $target_dir"
    cd "$target_dir" && verify_dir || return 1
}
