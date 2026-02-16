# /// script
# requires-python = ">=3.8"
# dependencies = [
#     "beautifulsoup4",
#     "lxml",
#     "bs2json",
#     "pymupdf",
#     "pandas",
#     "numpy",
#     "rich",
# ]
# ///
import json
import os
import re
import zipfile
from argparse import ArgumentParser
from os.path import join

import pandas as pd
import pymupdf
from bs2json import install
from bs4 import BeautifulSoup
from rich import print

fignum_regex = r"^\d[a-zA-Z]$"


def load_bibliography(biblio_json_path):
    """Load bibliography data from JSON file and create lookup dictionaries."""
    if not os.path.exists(biblio_json_path):
        print(f"[yellow]Warning: Bibliography file not found at {biblio_json_path}[/yellow]")
        return {}
    
    with open(biblio_json_path, 'r') as f:
        biblio_data = json.load(f)
    
    # Create mapping: normalized title -> biblio info
    title_lookup = {}
    
    for entry in biblio_data:
        # Format citation string
        citation = format_citation(entry)
        
        biblio_info = {
            'citation': citation,
            'title': entry.get('title', ''),
            'url': entry.get('URL', ''),
            'year': extract_year(entry),
            'raw': entry
        }
        
        # Add to lookup by normalized title
        if 'title' in entry:
            normalized_title = normalize_string(entry['title'])
            title_lookup[normalized_title] = biblio_info
    
    return title_lookup


def extract_year(entry):
    """Extract year from bibliography entry."""
    if 'issued' in entry and 'date-parts' in entry['issued']:
        date_parts = entry['issued']['date-parts']
        if date_parts and len(date_parts) > 0 and len(date_parts[0]) > 0:
            return str(date_parts[0][0])
    return ''


def format_citation(entry):
    """Format citation as 'First Author et al., Year'."""
    citation_parts = []
    
    # Get first author's last name
    if 'author' in entry and len(entry['author']) > 0:
        first_author = entry['author'][0]
        last_name = first_author.get('family', '')
        if last_name:
            if len(entry['author']) > 1:
                citation_parts.append(f"{last_name} et al.")
            else:
                citation_parts.append(last_name)
    
    # Add year
    year = extract_year(entry)
    if year:
        citation_parts.append(year)
    
    return ', '.join(citation_parts) if citation_parts else ''


def normalize_string(s):
    """Normalize string for comparison: lowercase, remove special chars, extra spaces."""
    # Convert to lowercase
    s = s.lower()
    # Remove common file extensions
    s = s.replace('.pdf', '').replace('.PDF', '')
    # Remove special characters but keep spaces
    s = re.sub(r'[^\w\s]', ' ', s)
    # Normalize whitespace
    s = re.sub(r'\s+', ' ', s).strip()
    return s


def get_similarity_ratio(s1, s2):
    """Calculate similarity ratio between two strings (0.0 to 1.0)."""
    import difflib
    return difflib.SequenceMatcher(None, s1, s2).ratio()


def match_source_to_biblio(source_name, source_attrs, title_lookup):
    """Try to match a source to bibliography data by title with improved strategy."""
    
    # Get filename from path
    filename = source_attrs.get('path', '').split('/')[-1]
    if not filename:
        filename = source_name
    
    # Remove .pdf extension and normalize
    normalized_filename = normalize_string(filename)
    
    # Strategy 1: Try exact match with normalized filename
    if normalized_filename in title_lookup:
        print(f"[green]✓ Matched: {filename}[/green]")
        return title_lookup[normalized_filename]
    
    # Strategy 2: Try exact match with source name
    normalized_source_name = normalize_string(source_name)
    if normalized_source_name in title_lookup:
        print(f"[green]✓ Matched: {source_name}[/green]")
        return title_lookup[normalized_source_name]
    
    # Strategy 3: Try fuzzy matching using similarity ratio (not just substring matching)
    best_match = None
    best_ratio = 0.7  # Require at least 70% similarity
    
    for title, biblio_info in title_lookup.items():
        # Try similarity with filename
        ratio_filename = get_similarity_ratio(normalized_filename, title)
        if ratio_filename > best_ratio:
            best_ratio = ratio_filename
            best_match = biblio_info
            print(f"[yellow]≈ Fuzzy match (filename): {filename} ({best_ratio:.1%}) ≈ {biblio_info['title'][:50]}...[/yellow]")
        
        # Try similarity with source name (only if filename match was not strong)
        if ratio_filename < 0.9:
            ratio_source = get_similarity_ratio(normalized_source_name, title)
            if ratio_source > best_ratio:
                best_ratio = ratio_source
                best_match = biblio_info
                print(f"[yellow]≈ Fuzzy match (source): {source_name} ({best_ratio:.1%}) ≈ {biblio_info['title'][:50]}...[/yellow]")
    
    if best_match:
        return best_match
    
    print(f"[red]✗ No match: {filename}[/red]")
    return None


def find_mqda_xml_file(unzipped_dir):
    """Find the main MAXQDA XML file in the unzipped directory."""
    # MAXQDA files typically have .mx* extensions for the main XML
    for root, dirs, files in os.walk(unzipped_dir):
        for file in files:
            # Look for XML files that might be the main project file
            if file.endswith('.xml') or file.endswith('.mx22') or file.endswith('.mx24'):
                return join(root, file)
            # Some MQDA files might have the XML without extension
            if 'project' in file.lower() and not file.endswith('.pdf'):
                return join(root, file)
    
    # If not found, look for any XML file
    for root, dirs, files in os.walk(unzipped_dir):
        for file in files:
            if file.endswith('.xml'):
                return join(root, file)
    
    raise ValueError("No MAXQDA project XML file found in the archive")


def extract_data(
    unzipped_dir,
    out_dir,
    biblio_json_path=None,
    smart_code_prefix="SMART - ",
    exclude_text_quotes=True,
    exclude_fignum_codes=True,
    exclude_source_groups=None,
):
    if exclude_source_groups is None:
        exclude_source_groups = []
        
    # Find PDF directory - might be named differently in MQDA
    pdf_dir = None
    possible_pdf_dirs = ['sources', 'externals', 'MAXQDA_Externals', 'PDFs']
    for possible_dir in possible_pdf_dirs:
        test_path = join(unzipped_dir, possible_dir)
        if os.path.exists(test_path):
            pdf_dir = test_path
            break
    
    if pdf_dir is None:
        # Search for PDFs in subdirectories
        for root, dirs, files in os.walk(unzipped_dir):
            if any(f.endswith('.pdf') for f in files):
                pdf_dir = root
                break
    
    if pdf_dir is None:
        print("[yellow]Warning: No PDF directory found[/yellow]")
        pdf_dir = join(unzipped_dir, "sources")
        os.makedirs(pdf_dir, exist_ok=True)

    # Find the main MAXQDA XML file
    mqda_file = find_mqda_xml_file(unzipped_dir)
    print(f"[green]Found MAXQDA file: {mqda_file}[/green]")

    with open(mqda_file, 'rb') as f:
        # Try different encodings
        content = None
        for encoding in ['utf-8', 'utf-16', 'latin-1']:
            try:
                f.seek(0)
                content = f.read().decode(encoding)
                break
            except:
                continue
        
        if content is None:
            raise ValueError("Could not decode MAXQDA file")
        
        soup = BeautifulSoup(content, "xml")

    # MAXQDA structure might be different - try to find the main project element
    project = soup.find("Project")
    if project is None:
        # Try other possible root elements
        project = soup.find("MaxQdaProject") or soup.find("MAXQDA") or soup
    
    sources = project.find("Sources") or project.find("Documents")
    
    if sources is None:
        print("[yellow]Warning: No Sources/Documents section found. Creating empty structure.[/yellow]")
        # Create minimal structure
        project_json = {
            "Project": {
                "CodeBook": {"Codes": {"Code": []}},
                "Sources": {"PDFSource": []},
                "Sets": {"Set": []}
            }
        }
    else:
        project_json = project.to_json()

    out_json = join(out_dir, "output.json")

    # Load bibliography data
    title_lookup = {}
    if biblio_json_path:
        title_lookup = load_bibliography(biblio_json_path)
        print(f"[green]Loaded {len(title_lookup)} bibliography entries[/green]")

    content_codes_dir = join(out_dir, "content", "codes")
    content_sources_dir = join(out_dir, "content", "sources")
    content_quotations_dir = join(out_dir, "content", "quotations")
    content_code_groups_dir = join(out_dir, "content", "code_groups")
    content_source_groups_dir = join(out_dir, "content", "source_groups")
    os.makedirs(content_codes_dir, exist_ok=True)
    os.makedirs(content_sources_dir, exist_ok=True)
    os.makedirs(content_quotations_dir, exist_ok=True)
    os.makedirs(content_code_groups_dir, exist_ok=True)
    os.makedirs(content_source_groups_dir, exist_ok=True)

    # Create list of code for which there are corresponding smart codes
    code_names_to_ignore = []
    code_guids_to_ignore = []
    fignum_code_guids = dict()

    # Safely access codes
    codes_list = []
    if "Project" in project_json and "CodeBook" in project_json["Project"]:
        if "Codes" in project_json["Project"]["CodeBook"]:
            codes_data = project_json["Project"]["CodeBook"]["Codes"]
            if "Code" in codes_data:
                code_item = codes_data["Code"]
                if isinstance(code_item, list):
                    codes_list = code_item
                elif isinstance(code_item, dict):
                    codes_list = [code_item]

    for code in codes_list:
        code_attrs = code.get("attrs", {})
        code_name = code_attrs.get("name", "")
        if code_name.startswith(smart_code_prefix):
            code_names_to_ignore.append(code_name[len(smart_code_prefix):])
        if exclude_fignum_codes and re.match(fignum_regex, code_name) is not None:
            code_names_to_ignore.append(code_name)
            fignum_code_guids[code_attrs.get("guid", "")] = code_name

    for code in codes_list:
        code_attrs = code.get("attrs", {})
        code_name = code_attrs.get("name", "")
        if code_name in code_names_to_ignore:
            code_guids_to_ignore.append(code_attrs.get("guid", ""))

    # Construct dataframe to enable computation of simple stats
    quotes_rows = []

    # Create separate files for codes
    code_guid_to_name = dict()
    all_codes = []
    for group in codes_list:
        all_codes.append(group)
        if "Code" in group:
            subcodes = group["Code"]
            if isinstance(subcodes, list):
                all_codes.extend(subcodes)
            elif isinstance(subcodes, dict):
                all_codes.append(subcodes)

    for code in all_codes:
        code_attrs = code.get("attrs", {})
        code_name = code_attrs.get("name", "")
        if code_name.startswith(smart_code_prefix):
            code_name = code_name[len(smart_code_prefix):]
            code_attrs["name"] = code_name
        code_guid = code_attrs.get("guid", "")
        code_guid_to_name[code_guid] = code_name

        if code_guid not in code_guids_to_ignore and code_guid:
            with open(join(content_codes_dir, f"{code_guid}.json"), "w") as f:
                json.dump(code_attrs, f, indent=4)

    # Handle Sets (code groups and source groups)
    source_group_name_to_member_source_guids = dict()
    sets_list = []
    if "Project" in project_json and "Sets" in project_json["Project"]:
        sets_data = project_json["Project"]["Sets"]
        if "Set" in sets_data:
            set_item = sets_data["Set"]
            if isinstance(set_item, list):
                sets_list = set_item
            elif isinstance(set_item, dict):
                sets_list = [set_item]

    for code_or_source_group in sets_list:
        if "MemberCode" in code_or_source_group:
            set_attrs = code_or_source_group.get("attrs", {})
            set_guid = set_attrs.get("guid", "")
            if set_guid:
                with open(join(content_code_groups_dir, f"{set_guid}.json"), "w") as f:
                    json.dump(code_or_source_group, f, indent=4)
                    
        if "MemberSource" in code_or_source_group:
            set_attrs = code_or_source_group.get("attrs", {})
            set_guid = set_attrs.get("guid", "")
            source_group_name = set_attrs.get("name", "")
            
            members = code_or_source_group["MemberSource"]
            if isinstance(members, dict):
                members = [members]
            
            source_group_name_to_member_source_guids[source_group_name] = [
                member.get("attrs", {}).get("targetGUID", "")
                for member in members
            ]
            
            if set_guid:
                with open(join(content_source_groups_dir, f"{set_guid}.json"), "w") as f:
                    json.dump(code_or_source_group, f, indent=4)

    # Track bibliography matches
    source_guid_to_biblio = {}
    matched_sources = 0
    total_sources = 0

    # Get PDF sources
    pdf_sources = []
    if "Project" in project_json and "Sources" in project_json["Project"]:
        sources_data = project_json["Project"]["Sources"]
        if "PDFSource" in sources_data:
            pdf_source = sources_data["PDFSource"]
            if isinstance(pdf_source, list):
                pdf_sources = pdf_source
            elif isinstance(pdf_source, dict):
                pdf_sources = [pdf_source]

    for source in pdf_sources:
        source_attrs = source.get("attrs", {})
        source_guid = source_attrs.get("guid", "")
        source_name = source_attrs.get("name", "")
        total_sources += 1

        # Skip sources that are part of the excluded source groups
        skip_source = False
        if len(exclude_source_groups) > 0:
            for source_group_name in exclude_source_groups:
                if source_guid in source_group_name_to_member_source_guids.get(source_group_name, []):
                    skip_source = True
        if skip_source:
            continue

        # Try to match with bibliography
        biblio_info = None
        if biblio_json_path:
            biblio_info = match_source_to_biblio(source_name, source_attrs, title_lookup)
            if biblio_info:
                matched_sources += 1
                source_guid_to_biblio[source_guid] = biblio_info
                source_attrs['bibliography'] = {
                    'citation': biblio_info['citation'],
                    'title': biblio_info['title'],
                    'url': biblio_info['url'],
                    'year': biblio_info['year']
                }

        if source_guid:
            with open(join(content_sources_dir, f"{source_guid}.json"), "w") as f:
                json.dump(source_attrs, f, indent=4)

        # Handle selections/quotations
        if "PDFSelection" not in source:
            continue

        selections = source["PDFSelection"]
        if isinstance(selections, dict):
            selections = [selections]

        for quotation in selections:
            if "Coding" in quotation:
                quotation_attrs = quotation.get("attrs", {})
                quotation_guid = quotation_attrs.get("guid", "")
                quotation_name = quotation_attrs.get("name", "")
                quotation["source_guid"] = source_guid

                is_text_quote = "\u00d7" not in quotation_name
                if exclude_text_quotes and is_text_quote:
                    continue

                subfig_num = None

                codings = quotation["Coding"]
                if isinstance(codings, dict):
                    codings = [codings]

                # Remove codes that are to be ignored
                cleaned_codes_for_quotation = []
                for c in codings:
                    code_ref = c.get("CodeRef", {})
                    code_ref_attrs = code_ref.get("attrs", {})
                    code_guid = code_ref_attrs.get("targetGUID", "")
                    
                    if code_guid not in code_guids_to_ignore:
                        cleaned_codes_for_quotation.append(c)

                    if code_guid in fignum_code_guids:
                        subfig_num = fignum_code_guids[code_guid]

                quotation["Coding"] = cleaned_codes_for_quotation
                quotation["subfig_num"] = subfig_num

                if quotation_guid:
                    with open(join(content_quotations_dir, f"{quotation_guid}.json"), "w") as f:
                        json.dump(quotation, f, indent=4)

                for c in cleaned_codes_for_quotation:
                    code_ref = c.get("CodeRef", {})
                    code_ref_attrs = code_ref.get("attrs", {})
                    coderef_guid = code_ref_attrs.get("targetGUID", "")
                    
                    quotes_rows.append({
                        "source_guid": source_guid,
                        "source": source_name,
                        "citation": source_guid_to_biblio.get(source_guid, {}).get('citation', ''),
                        "paper_title": source_guid_to_biblio.get(source_guid, {}).get('title', ''),
                        "paper_url": source_guid_to_biblio.get(source_guid, {}).get('url', ''),
                        "year": source_guid_to_biblio.get(source_guid, {}).get('year', ''),
                        "merged_subfig_num": subfig_num,
                        "quote_guid": quotation_guid,
                        "coderef_guid": coderef_guid,
                        "code_name": code_guid_to_name.get(coderef_guid, ''),
                    })

    if biblio_json_path:
        print(f"[green]Bibliography matching: {matched_sources}/{total_sources} sources matched[/green]")

    def get_fig_num(merged_subfig_num):
        if merged_subfig_num is not None and len(merged_subfig_num) >= 1:
            return merged_subfig_num[0]
        return None

    def get_subfig_num(merged_subfig_num):
        if merged_subfig_num is not None and len(merged_subfig_num) == 2:
            return merged_subfig_num[1]
        return None

    quotes_df = pd.DataFrame(data=quotes_rows)
    if len(quotes_df) > 0:
        quotes_df["fig_num"] = quotes_df["merged_subfig_num"].apply(get_fig_num)
        quotes_df["subfig_num"] = quotes_df["merged_subfig_num"].apply(get_subfig_num)
    quotes_df.to_csv(join(out_dir, "quotes.csv"), index=True)

    img_dir = join(out_dir, "images")

    # Extract images from PDFs
    for source in sources.find_all("PDFSource") if sources else []:
        pdf_guid = source.get("guid", "")
        pdf_file = source.get("path", "")[11:] if source.get("path", "").startswith("internal://") else source.get("path", "")
        pdf_path = join(pdf_dir, pdf_file)

        if not os.path.exists(pdf_path):
            print(f"[yellow]Warning: PDF not found at {pdf_path}[/yellow]")
            continue

        try:
            doc = pymupdf.open(pdf_path)
            os.makedirs(join(img_dir, pdf_guid), exist_ok=True)

            selections = source.find_all("PDFSelection")
            for selection in selections:
                sel_page = selection.get("page", "0")
                page = doc.load_page(int(sel_page))

                sel_x1 = int(selection.get("firstX", 0))
                sel_x2 = int(selection.get("secondX", 0))
                sel_y1 = page.rect.y1 - int(selection.get("secondY", 0))
                sel_y2 = page.rect.y1 - int(selection.get("firstY", 0))
                sel_guid = selection.get("guid", "")

                mat = pymupdf.Matrix(8, 8)

                sel_rect = pymupdf.Rect(sel_x1, sel_y1, sel_x2, sel_y2)
                pix = page.get_pixmap(matrix=mat, clip=sel_rect)

                png_file = join(img_dir, pdf_guid, f"{sel_guid}.png")

                with open(png_file, "wb") as f:
                    f.write(pix.tobytes("png"))
                    
            doc.close()
        except Exception as e:
            print(f"[red]Error processing PDF {pdf_file}: {e}[/red]")

    with open(join(out_dir, "output.json"), "w") as f:
        json.dump(project_json, f, indent=4)

    print("[green]Done[/green]")


if __name__ == "__main__":
    install()
    parser = ArgumentParser()
    parser.add_argument("--input", type=str, required=True, help="Path to .mqda file")
    parser.add_argument("--output", type=str, required=True, help="Output directory")
    parser.add_argument("--bibliography", type=str, help="Path to bibliography JSON file")
    parser.add_argument("--exclude-source-groups", nargs="*", default=[])
    args = parser.parse_args()

    unzipped_dir = join(args.output, "unzipped")
    out_dir = args.output
    os.makedirs(out_dir, exist_ok=True)

    with zipfile.ZipFile(args.input, "r") as zip_ref:
        zip_ref.extractall(unzipped_dir)

    extract_data(
        unzipped_dir, 
        out_dir, 
        biblio_json_path=args.bibliography,
        exclude_source_groups=args.exclude_source_groups
    )