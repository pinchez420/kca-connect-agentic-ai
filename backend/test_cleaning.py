
import re

def clean_text(text):
    # 1. Normalization: paragraphs
    # Replace 2+ newlines with a unique placeholder
    text = re.sub(r'
\s*
', '<PARAGRAPH>', text)
    
    # 2. Unwrap single newlines (replace with space)
    text = re.sub(r'
', ' ', text)
    
    # 3. Restore paragraphs
    text = text.replace('<PARAGRAPH>', '

')
    
    # 4. Fix camelCase (LowerUpper) -> 'word Word'
    text = re.sub(r'(?<=[a-z])(?=[A-Z])', ' ', text)
    
    # 5. Fix UpperTitle (UpperUpper+lower) -> 'SYSTEMS If'
    # Look for an Uppercase letter, followed by an Uppercase letter which is followed by a lowercase letter.
    # We want to put a space between the first Upper and the second Upper.
    text = re.sub(r'(?<=[A-Z])(?=[A-Z][a-z])', ' ', text)
    
    # 6. Fix PeriodUpper -> 'end. Start'
    text = re.sub(r'(?<=\.)(?=[A-Z])', ' ', text)
    
    # 7. Collapse multiple spaces
    text = re.sub(r'[ 	]+', ' ', text)
    
    return text.strip()

samples = [
    'Expert Systems
timetable',  # Should be 'Expert Systems timetable'
    'Program: BIT FT 3.2
Day: Friday', # Should be 'Program: BIT FT 3.2 Day: Friday' ?? or maybe lists?
    'Unit: ISS 3102 EXPERT SYSTEMSIf you need', # Should be 'SYSTEMS If'
    'Contacting Griffin KengaTo reach', # Should be 'Kenga To'
    'This is a paragraph.

This is the next one.', # Should keep 


    'Title
Subtitle', # 'Title Subtitle'
    'Name List:
1. John
2. Doe' # 'Name List: 1. John 2. Doe' -> Lists might get mangled?
]

for s in samples:
    print(f'ORIG: {repr(s)}')
    print(f'NEW : {repr(clean_text(s))}')
    print('-' * 20)

