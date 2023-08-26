import json
import re
import io

#"""Builds the kanji composition js file"""

# This script will be generate the kjwk-composition.js that basicly the main structure of visual graph
input_file = 'C:/xampp/htdocs/jp/raw/kanji-composition-map.txt'
output_file = 'C:/xampp/htdocs/jp/html/js/kjwk-composition.js'
composition = {}

# Description of the script's purpose
# This script generates a JSON file that containing structure of kanji, that will draw in canvas.
# In short kjwk-composition.js is main file that will be refer by system to draw the relation between kanjis and radicals

# "r" stand for read
with io.open(input_file, "r", encoding="utf8") as fp:
    lines = fp.readlines()

for line in lines:
    # Strip any comments
    i = line.find('#')
    if i >= 0:
        line = line[:i]
    # Skip any lines without "kanji: part1 part2" etc.
    i = line.find(':')
    if i < 0:
        continue
    whole, part_str = re.split(r'\s*:\s*', line.rstrip())
    # If part_str is empty, we want parts == [] instead of parts == ['']
    parts = [x for x in re.split(r'\s+', part_str) if x != '']
    composition[whole] = parts

# "w" stand for write
with io.open(output_file, "w", encoding='utf8') as fp:
    fp.write("kanji_parts = ")
    # For debug, use indent=4; for production, leave it minified -> json.dump(composition, fp, ensure_ascii=False, indent=4)
    # Check ensure_ascii -> False (Print the kanji as is); True (print the kanji as unicode)
    print("INFO", "Clear browser cache to load new kjwk-composition.js", sep=" - ")
    json.dump(composition, fp, ensure_ascii=False)