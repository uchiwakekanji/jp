import xmltodict
import json
import io
import os
from re import search

#"""Builds the kanji dict json file"""
input_file = 'C:/xampp/htdocs/jp/src/experimental/in/xml-sample-02.xml'
output_file = 'C:/xampp/htdocs/jp/src/experimental/out/json-output.json'

#This script will be generate the kanji-dict.js that basicly the main info of specific kanji (such as how to read in kunyomi and onyomi)

# "r" stand for read
with io.open(input_file, "r", encoding="utf8") as f:
	tags = [i.strip() for i in f.readlines()]

#define the filetered fields
filtered = []
filtered.append("<characters>")
patterns = [
	"character",
	"literal",
	"radical",
	"classical",
	"misc",
	"grade",
	"freq",
	"reading_meaning",
	"ja_on",
	"ja_kun",
	"<meaning>"
]

grade_inx = []

#looping to create the json message
for tag in tags:
	for pattern in patterns:
		if search(pattern, tag):
			if pattern == "freq":
				filtered.append("<is_jouyou>true</is_jouyou>")
			elif pattern == "ja_on":
				filtered.append(f'<on_readings>{search(r"<[^>]*>(.*?)</[^>]*>", tag).group(1)}</on_readings>')
			elif pattern == "ja_kun":
				filtered.append(f'<kun_readings>{search(r"<[^>]*>(.*?)</[^>]*>", tag).group(1)}</kun_readings>')
			elif pattern == "classical":
				filtered.append(f'<classical>{search(r"<[^>]*>(.*?)</[^>]*>", tag).group(1)}</classical>')
			else:
				filtered.append(tag)
			break
incm = 1
for inx, item in enumerate(filtered):
	if "grade" in item:
		if not "is_jouyou" in filtered[inx+1]:
			grade_inx.append(inx+incm)
			incm += 1

filtered.append("</characters>")

for inx in grade_inx:
	filtered.insert(inx, "<is_jouyou>false</is_jouyou>")

xml_data = xmltodict.parse("".join(filtered))

retn = dict()

for o in range(len(xml_data['characters']['character'])):
	retn[xml_data['characters']['character'][o]['literal']] = dict({
		"on_readings": xml_data['characters']['character'][o]['reading_meaning']['on_readings'],
		"kun_readings": xml_data['characters']['character'][o]['reading_meaning']['kun_readings'],
		"meaning": xml_data['characters']['character'][o]['reading_meaning']['meaning'],
		"grade": xml_data['characters']['character'][o]['misc']['grade'],
		"is_jouyou": xml_data['characters']['character'][o]['misc']['is_jouyou'],
		"radical": xml_data['characters']['character'][o]['radical']['classical']
	})

# ensure_ascii -> False (Print the kanji as is); True (print the kanji as unicode)
json_data = json.dumps(retn, indent=4, ensure_ascii=True)

#remove file if exist
if os.path.exists(output_file):
    os.remove(output_file)
    print(f"File {output_file} deleted successfully.")
else:
    print(f"File {output_file} does not exist.")

# "w" stand for write
with io.open('C:/xampp/htdocs/jp/src/experimental/out/json-output.json', 'w', encoding='utf-8') as f:
	f.write(json_data)
	print("INFO", "json-output.json created", sep=" - ")