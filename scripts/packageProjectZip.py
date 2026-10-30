#!/usr/bin/env python3
"""
MinaDental Enterprise Packaging Script
Generates a complete, clean source code zip archive for instant download.
Excludes node_modules, build artifacts, git history, and local caches.
"""

import os
import zipfile
import sys

def package_project():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    output_dir = os.path.join(root_dir, 'public')
    os.makedirs(output_dir, exist_ok=True)
    zip_path = os.path.join(output_dir, 'minadental-source-full.zip')

    exclude_dirs = {
        'node_modules', '.git', 'dist', '.aistudio', '__pycache__', '.vite'
    }
    exclude_files = {
        'minadental-source-full.zip', '.DS_Store'
    }

    total_files = 0
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(root_dir):
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            for f in files:
                if f in exclude_files:
                    continue
                full_path = os.path.join(root, f)
                arc_name = os.path.relpath(full_path, root_dir)
                zf.write(full_path, arc_name)
                total_files += 1

    file_size_kb = round(os.path.getsize(zip_path) / 1024, 2)
    print(f"✅ MinaDental Project Archive Created Successfully!")
    print(f"📦 Path: {zip_path}")
    print(f"📄 Files Packaged: {total_files}")
    print(f"⚖️ Archive Size: {file_size_kb} KB")

if __name__ == '__main__':
    package_project()
