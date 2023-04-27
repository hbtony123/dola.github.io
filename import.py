import os
import re
from tqdm import tqdm

folder_path = r'C:\github\hbtony123.github.io'

# Define regex pattern to match external links
pattern = r'<a\s+(?:[^>]*?\s+)?href=(["\'])(.*?)\1'

# Loop through all files in folder
for root, dirs, files in os.walk(folder_path):
    for file in tqdm(files, desc='Processing files', unit='file'):
        # Check if file is HTML
        if file.endswith('.html'):
            file_path = os.path.join(root, file)
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
            except UnicodeDecodeError:
                print(f"Error: {file_path} cannot be decoded using utf-8 encoding.")
                continue
            # Remove external links
            content = re.sub(pattern, lambda m: m.group(0) if 'http' not in m.group(2) else '', content)
            # Remove script and div tags
            content = re.sub(r'<script>.*?</script>|<div class="m-page">.*?</div>', '', content, flags=re.DOTALL)
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)