#!/usr/bin/env python3
"""
Extract source names from QDPX/QDE files to use with diagnose_matching.py
"""

import zipfile
import json
import xml.etree.ElementTree as ET
from pathlib import Path
from argparse import ArgumentParser
from bs4 import BeautifulSoup

def extract_sources_from_qdpx(qdpx_file):
    """Extract source names from QDPX file."""
    sources = []
    
    try:
        with zipfile.ZipFile(qdpx_file, 'r') as zip_ref:
            # List contents
            file_list = zip_ref.namelist()
            
            # Find the main project XML file
            qde_files = [f for f in file_list if f.endswith('.qde')]
            
            if not qde_files:
                print(f"❌ No .qde files found in {qdpx_file}")
                return sources
            
            # Use the first QDE file
            qde_file = qde_files[0]
            print(f"📄 Reading: {qde_file}")
            
            with zip_ref.open(qde_file) as f:
                content = f.read().decode('utf-8', errors='ignore')
                soup = BeautifulSoup(content, 'xml')
                
                # Find all PDFSource elements and extract names
                for pdf_source in soup.find_all('PDFSource'):
                    name = pdf_source.get('name')
                    if name:
                        sources.append(name)
                
                print(f"✅ Found {len(sources)} sources")
    
    except Exception as e:
        print(f"❌ Error reading {qdpx_file}: {e}")
    
    return sources

def main():
    parser = ArgumentParser()
    parser.add_argument("qdpx_file", type=str, help="Path to QDPX file")
    parser.add_argument("--output", type=str, default="sources.txt", help="Output file for source names")
    args = parser.parse_args()
    
    print(f"🔍 Extracting sources from: {args.qdpx_file}\n")
    
    sources = extract_sources_from_qdpx(args.qdpx_file)
    
    if sources:
        # Write to file
        with open(args.output, 'w') as f:
            for source in sources:
                f.write(f"{source}\n")
        
        print(f"\n📝 Sources saved to: {args.output}")
        print(f"\nFirst 5 sources:")
        for source in sources[:5]:
            print(f"  • {source}")
    else:
        print("❌ No sources found!")

if __name__ == "__main__":
    main()
