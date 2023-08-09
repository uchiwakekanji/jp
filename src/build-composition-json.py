import json
import re
import io

#"""Builds the kanji composition json file"""

#This script will be generate the kjwk-composition.js that basicly the main structure of visual graph
input_file = 'C:/xampp/htdocs/jp/raw/kanji-composition-map.txt'
output_file = 'C:/xampp/htdocs/jp/html/js/kjwk-composition.js'
composition = {}

# "r" stand for read
with open(input_file, "r", encoding="utf8") as fp:
    lines = fp.readlines()

for line in lines:
    # strip any comments
    i = line.find('#')
    if i >= 0:
        line = line[:i]
    # skip any lines without "kanji: part1 part2" etc.
    i = line.find(':')
    if i < 0:
        continue
    whole, part_str = re.split(r'\s*:\s*', line.rstrip())
    # if part_str is empty, we want parts == [] instead of parts == ['']
    parts = [x for x in re.split(r'\s+', part_str) if x != '']
    composition[whole] = parts

# "w" stand for write
with io.open(output_file, "w", encoding='utf8') as fp:
    fp.write("kanji_parts = ")
    # for debug, use indent=4; for production, leave it minified -> json.dump(composition, fp, ensure_ascii=False, indent=4)
    # ensure_ascii -> False (Print the kanji as is); True (print the kanji as unicode)
    json.dump(composition, fp, ensure_ascii=False)