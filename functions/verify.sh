#!/bin/bash

check_file() {
    file="$1"
    printf "  - %-20s" "$file"
    if [ -e "$file" ]; then
        echo "✅"
        return 0
    else
        echo "❌"
        return 1
    fi
}

verify_dir() {
    pwd_current=$(pwd)
    echo -e "\n🔍 Verifying environment:"
    echo "Location: $pwd_current"
    
    verification_failed=0
    
    if [ "$pwd_current" = "/Users/robertblackwell/firebase-csv-import/functions" ]; then
        echo "Required files for functions directory:"
        check_file "index.js" || verification_failed=1
        check_file "package.json" || verification_failed=1
        check_file "node_modules" || verification_failed=1
        check_file "security.js" || verification_failed=1
    elif [ "$pwd_current" = "/Users/robertblackwell/firebase-csv-import" ]; then
        echo "Required files for root directory:"
        check_file "functions" || verification_failed=1
        check_file ".git" || verification_failed=1
        check_file "index.html" || verification_failed=1
    else
        echo "❌ Unknown directory: $pwd_current"
        return 1
    fi
    
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
