import json
import io
import xmltodict

#"""Builds the kanji composition json file"""

#This script will be generate the kanji-dict.js that basicly the main info of specific kanji (such as how to read in kunyomi and onyomi)
input_file = 'C:/xampp/htdocs/jp/raw/kanji-dict.txt'
output_file = 'C:/xampp/htdocs/jp/html/js/kanji-dict.js'
composition = {}

# "r" stand for read
with open(input_file, "r", encoding="utf8") as xml_file:
     
    # open the input xml file and read
    # data in form of python dictionary
    # using xmltodict module
    data_dict = xmltodict.parse(xml_file.read())
    # xml_file.close()
    
    # for debug, use indent=2; for production, leave it minified (remove the indent=2)
    json_data = json.dumps(data_dict, ensure_ascii=True, indent=2)

    # "w" stand for write
    with io.open(output_file, "w", encoding='utf8') as json_file:
        json_file.write(json_data)
        # json_file.close()