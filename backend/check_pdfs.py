import glob
import os
from langchain_community.document_loaders import PyPDFLoader

pdf_files = glob.glob("../pdf documents/*.pdf")
print(f"Found {len(pdf_files)} PDF files.")

total_pages = 0
for f in sorted(pdf_files):
    try:
        loader = PyPDFLoader(f)
        docs = loader.load()
        print(f"{os.path.basename(f)}: {len(docs)} pages")
        total_pages += len(docs)
    except Exception as e:
        print(f"{os.path.basename(f)}: Error {e}")

print(f"\nTotal pages loaded: {total_pages}")
