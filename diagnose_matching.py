#!/usr/bin/env python3
"""
Diagnostic script to debug title matching issues between databases.
Shows which sources match bibliography entries and which don't.
"""

import json
import re
import difflib
from pathlib import Path
from argparse import ArgumentParser

def normalize_string(s):
    """Normalize string for comparison."""
    s = s.lower()
    s = s.replace('.pdf', '').replace('.PDF', '')
    s = re.sub(r'[^\w\s]', ' ', s)
    s = re.sub(r'\s+', ' ', s).strip()
    return s

def get_similarity_ratio(s1, s2):
    """Calculate similarity ratio."""
    return difflib.SequenceMatcher(None, s1, s2).ratio()

def load_bibliography(path):
    """Load bibliography entries."""
    with open(path, 'r') as f:
        return json.load(f)

def analyze_matching(sources, bibliography):
    """Analyze matching between sources and bibliography."""
    
    # Create lookup
    title_lookup = {}
    for entry in bibliography:
        title = entry.get('title', '')
        if title:
            normalized = normalize_string(title)
            title_lookup[normalized] = {
                'original': title,
                'entry': entry
            }
    
    print(f"\n📚 Bibliography: {len(title_lookup)} entries")
    print(f"📄 Sources: {len(sources)} entries\n")
    
    matched = []
    unmatched = []
    
    for source_name in sources:
        normalized_source = normalize_string(source_name)
        
        # Try exact match
        if normalized_source in title_lookup:
            matched.append({
                'source': source_name,
                'biblio': title_lookup[normalized_source]['original'],
                'method': 'EXACT',
                'ratio': 1.0
            })
            continue
        
        # Try fuzzy match
        best_match = None
        best_ratio = 0.7
        
        for norm_title, biblio_info in title_lookup.items():
            ratio = get_similarity_ratio(normalized_source, norm_title)
            if ratio > best_ratio:
                best_ratio = ratio
                best_match = {
                    'source': source_name,
                    'biblio': biblio_info['original'],
                    'method': 'FUZZY',
                    'ratio': ratio
                }
        
        if best_match:
            matched.append(best_match)
        else:
            unmatched.append(source_name)
    
    # Print results
    print("=" * 100)
    print("✅ MATCHED SOURCES")
    print("=" * 100)
    for item in sorted(matched, key=lambda x: x['ratio'], reverse=True):
        print(f"\n[{item['method']:5}] Ratio: {item['ratio']:.1%}")
        print(f"  Source: {item['source']}")
        print(f"  Biblio: {item['biblio']}")
    
    print("\n" + "=" * 100)
    print("❌ UNMATCHED SOURCES")
    print("=" * 100)
    for source in unmatched:
        norm_source = normalize_string(source)
        print(f"\n❌ {source}")
        print(f"   Normalized: {norm_source}")
        
        # Show top 3 closest matches
        closest = []
        for norm_title, biblio_info in title_lookup.items():
            ratio = get_similarity_ratio(norm_source, norm_title)
            closest.append((ratio, biblio_info['original']))
        
        closest.sort(reverse=True)
        print("   Closest matches in bibliography:")
        for i, (ratio, title) in enumerate(closest[:3], 1):
            print(f"     {i}. ({ratio:.1%}) {title[:70]}...")
    
    print(f"\n" + "=" * 100)
    print(f"Summary: {len(matched)}/{len(sources)} sources matched ({len(matched)/len(sources)*100:.1f}%)")
    print("=" * 100)

if __name__ == "__main__":
    parser = ArgumentParser()
    parser.add_argument("--sources", type=str, required=True, help="File with source names (one per line)")
    parser.add_argument("--bibliography", type=str, required=True, help="Bibliography JSON file")
    args = parser.parse_args()
    
    # Load sources
    with open(args.sources, 'r') as f:
        sources = [line.strip() for line in f if line.strip()]
    
    # Load bibliography
    bibliography = load_bibliography(args.bibliography)
    
    # Analyze
    analyze_matching(sources, bibliography)
