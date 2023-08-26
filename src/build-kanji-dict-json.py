import xmltodict
import json
import io
import os
from re import search
import pdb

#"""Builds the kanji dict2 js file"""

# Input and output file paths
input_file = 'C:/xampp/htdocs/jp/src/raw-dict2/kanjidic2.xml'
output_file = 'C:/xampp/htdocs/jp/html/local-resources/cdn.rawgit.com/danang.priabada/kanji-dict2.js'

# Description of the script's purpose
# This script generates a JSON file containing main information about specific kanji, including readings and meanings.
# This script will be generate the kanji-dict.js that basicly the main info of specific kanji (such as how to read in kunyomi and onyomi)

# Read the input XML file
# "r" stand for read
with io.open(input_file, "r", encoding="utf8") as f:
	tags = [i.strip() for i in f.readlines()]

# Define the filtered fields for extraction
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

# Loop through the XML tags and filter relevant data
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

# Process and insert optional "is_jouyou" field
incm = 1
for inx, item in enumerate(filtered):
	if "grade" in item:
		if not "is_jouyou" in filtered[inx+1]:
			grade_inx.append(inx+incm)
			incm += 1

filtered.append("</characters>")

for inx in grade_inx:
	filtered.insert(inx, "<is_jouyou>false</is_jouyou>")

# Parse filtered XML data using xmltodict
xml_data = xmltodict.parse("".join(filtered))
# Prepare the JSON output
retn = dict()

for o in range(len(xml_data['characters']['character'])):
	# general fields parent
	character_data = xml_data['characters']['character'][o]
	
	# define fields that has null posibility
	misc_dict = xml_data['characters']['character'][o].get('misc', {})
	reading_meaning = character_data.get('reading_meaning', {})
	radical = character_data.get('radical', {})

	#pdb.set_trace() # Debug Point

	# If 'misc_dict' dictionary is None, set a default value
	if misc_dict is None:
		is_jouyou = False # set default as False
		grade = -1 # 0 mean grade is no defined
	else:
		grade = int(misc_dict.get('grade', -1))
		is_jouyou = bool(misc_dict.get('is_jouyou', False))

	# If 'reading_meaning' dictionary is None, set a default value
	if reading_meaning is None:
		on_readings = []
		kun_readings = []
		meanings = []
		radical = -1
	else:
		on_readings = reading_meaning.get('on_readings', [])
		kun_readings = reading_meaning.get('kun_readings', [])
		meanings = reading_meaning.get('meaning', [])
		radical = int(character_data.get('radical', {}).get('classical', -1))
		
		# Convert single values to a list
		if not isinstance(on_readings, list):
			on_readings = [on_readings]
		if not isinstance(kun_readings, list):
			kun_readings = [kun_readings]
		if not isinstance(meanings, list):
			meanings = [meanings]
		
	retn[xml_data['characters']['character'][o]['literal']] = dict({
		"on_readings": on_readings,
		"kun_readings": kun_readings,
		"meanings": meanings,
		"grade": grade,
		"is_jouyou": is_jouyou,
		"radical": radical
	})

# Convert to JSON format
# ensure_ascii -> False (Print the kanji as is); True (print the kanji as unicode)
json_data = json.dumps(retn, ensure_ascii=True, indent=4)

# Remove the output file if it exists
if os.path.exists(output_file):
    os.remove(output_file)
    print(f"File {output_file} deleted successfully.")
else:
    print(f"File {output_file} does not exist.")

# Write the JSON data to the output file
# "w" stand for write
with io.open('C:/xampp/htdocs/jp/html/local-resources/cdn.rawgit.com/danang.priabada/kanji-dict2.js', 'w', encoding='utf-8') as f:
	f.write(f'kanji_defs = {json_data}')
	print("INFO", "json-output.json created", sep=" - ")