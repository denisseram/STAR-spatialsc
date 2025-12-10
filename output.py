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
import difflib

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


def match_source_to_biblio(source_name, source_attrs, title_lookup):
    """Try to match a source to bibliography data by title, with debug prints."""
    
    filename = source_attrs.get('name', '')
    print(filename, "YA BASTA")
    if not filename:
        filename = source_name
    
    normalized_filename = normalize_string(filename)
    normalized_source_name = normalize_string(source_name)


    
    # Strategy 1: exact match with normalized filename
    if normalized_filename in title_lookup:
        print(f"[green]✓ Exact match filename: {filename}[/green]")
        return title_lookup[normalized_filename]
    
    # Strategy 2: exact match with normalized source name
    if normalized_source_name in title_lookup:
        print(f"[green]✓ Exact match source name: {source_name}[/green]")
        return title_lookup[normalized_source_name]
    
    # Strategy 3: fuzzy match (contains)
    if len(normalized_filename) > 15:
        for title, biblio_info in title_lookup.items():
            shorter = min(normalized_filename, title, key=len)
            longer = max(normalized_filename, title, key=len)

            # print each comparison
            print(f"[yellow]Comparing:[/yellow] '{shorter}' in '{longer}'?")
            
            if shorter in longer:
                print(f"[yellow]≈ Fuzzy match: {filename} ≈ {biblio_info['title'][:50]}...[/yellow]")
                return biblio_info
    
    print(f"[red]✗ No match: {filename}[/red]")
    return None



def extract_data(
    unzipped_dir,
    out_dir,
    biblio_json_path=None,
    smart_code_prefix="SMART - ",
    exclude_text_quotes=True,
    exclude_fignum_codes=True,
    exclude_source_groups=None,
):
    pdf_dir = join(unzipped_dir, "sources")
    unzipped_files = os.listdir(unzipped_dir)

    # MAXQDA often includes multiple .qde files. We must choose the one that contains <Project>.
    qde_files = [join(unzipped_dir, f) for f in unzipped_files if f.endswith(".qde")]
    if len(qde_files) == 0:
        raise ValueError("No .qde files found")

    qde_file = None
    for fpath in qde_files:
        with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
            text = f.read(5000)  # read only beginning
            if "<Project" in text:
                qde_file = fpath
                break

    if qde_file is None:
        raise ValueError("Could not find the main .qde file containing <Project>")

    print(f"[green]Using QDE file:[/green] {qde_file}")


    with open(qde_file) as f:
        soup = BeautifulSoup(f, "xml")

    project = soup.find("Project")
    sources = project.find("Sources")
    project_json = project.to_json()

    assert project_json, "no project"

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

    fignum_code_guids = dict()  # GUID to name (e.g., "2a") mapping
    for code in project_json["Project"]["CodeBook"]["Codes"]["Code"]:
        code_attrs = code["attrs"]
        code_name = code_attrs["name"]
        if code_name.startswith(smart_code_prefix):
            code_names_to_ignore.append(code_name[len(smart_code_prefix) :])
        if exclude_fignum_codes and re.match(fignum_regex, code_name) is not None:
            code_names_to_ignore.append(code_name)
            fignum_code_guids[code_attrs["guid"]] = code_name

    for code in project_json["Project"]["CodeBook"]["Codes"]["Code"]:
        code_attrs = code["attrs"]
        code_name = code_attrs["name"]
        if code_name in code_names_to_ignore:
            code_guids_to_ignore.append(code_attrs["guid"])

    # Construct dataframe to enable computation of simple stats
    quotes_rows = []

    # Create separate files for astro
    code_guid_to_name = dict()
    for code in [
        c
        for group in project_json["Project"]["CodeBook"]["Codes"]["Code"]
        for c in [group] + group.get("Code", [])
    ]:
        code_attrs = code["attrs"]
        code_name = code_attrs["name"]
        if code_name.startswith(smart_code_prefix):
            code_name = code_name[len(smart_code_prefix) :]
            code_attrs["name"] = code_name
        code_guid = code_attrs["guid"]
        code_guid_to_name[code_guid] = code_name

        if code_guid not in code_guids_to_ignore:
            with open(join(content_codes_dir, f"{code_guid}.json"), "w") as f:
                json.dump(code_attrs, f, indent=4)

    # Sets can represent code groups (MemberCode) or source groups (MemberSource)
    source_group_name_to_member_source_guids = dict()
    for code_or_source_group in project_json["Project"].get("Sets", {}).get("Set", []):
        if "MemberCode" in code_or_source_group:
            set_attrs = code_or_source_group["attrs"]
            set_guid = set_attrs["guid"]

            with open(join(content_code_groups_dir, f"{set_guid}.json"), "w") as f:
                json.dump(code_or_source_group, f, indent=4)
        if "MemberSource" in code_or_source_group:
            set_attrs = code_or_source_group["attrs"]
            set_guid = set_attrs["guid"]

            source_group_name = set_attrs["name"]
            source_group_name_to_member_source_guids[source_group_name] = [
                member["attrs"]["targetGUID"]
                for member in code_or_source_group["MemberSource"]
            ]

            with open(join(content_source_groups_dir, f"{set_guid}.json"), "w") as f:
                json.dump(code_or_source_group, f, indent=4)

    # Track bibliography matches
    source_guid_to_biblio = {}
    matched_sources = 0
    total_sources = 0

    for source in project_json["Project"]["Sources"]["PDFSource"]:
        source_attrs = source["attrs"]
        source_guid = source_attrs["guid"]
        source_name = source_attrs["name"]
        total_sources += 1

        # Skip sources that are part of the excluded source groups
        skip_source = False
        if len(exclude_source_groups) > 0:
            for source_group_name in exclude_source_groups:
                if (
                    source_guid
                    in source_group_name_to_member_source_guids[source_group_name]
                ):
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
                # Add bibliography info to source attributes
                source_attrs['bibliography'] = {
                    'citation': biblio_info['citation'],
                    'title': biblio_info['title'],
                    'url': biblio_info['url'],
                    'year': biblio_info['year']
                }
                for src in project_json["Project"]["Sources"]["PDFSource"]:
                    if src["attrs"]["guid"] == source_guid:
                        src["attrs"]["bibliography"] = source_attrs["bibliography"]

        with open(join(content_sources_dir, f"{source_guid}.json"), "w") as f:
            json.dump(source_attrs, f, indent=4)

        # there might not be a selection in a PDF
        if "PDFSelection" not in source:
            continue

        # if there's only one selection in a single PDF,
        # `source["PDFSelection"]` is a dict and not an array
        if isinstance(source["PDFSelection"], dict):
            source["PDFSelection"] = [source["PDFSelection"]]

        for quotation in source["PDFSelection"]:
            if "Coding" in quotation:
                quotation_attrs = quotation["attrs"]
                quotation_guid = quotation_attrs["guid"]
                quotation_name = quotation_attrs["name"]
                quotation["source_guid"] = source_guid

                is_text_quote = "\u00d7" not in quotation_name
                if exclude_text_quotes and is_text_quote:
                    continue

                subfig_num = None

                if isinstance(quotation["Coding"], dict):
                    quotation["Coding"] = [quotation["Coding"]]

                # Remove codes that are to be ignored
                cleaned_codes_for_quotation = []
                for c in quotation["Coding"]:
                    code_guid = c["CodeRef"]["attrs"]["targetGUID"]
                    if code_guid not in code_guids_to_ignore:
                        cleaned_codes_for_quotation.append(c)

                    if code_guid in fignum_code_guids:
                        subfig_num = fignum_code_guids[code_guid]

                # Update the quotation with the cleaned codes
                quotation["Coding"] = cleaned_codes_for_quotation
                quotation["subfig_num"] = subfig_num

                with open(
                    join(content_quotations_dir, f"{quotation_guid}.json"), "w"
                ) as f:
                    json.dump(quotation, f, indent=4)

                quotes_rows += [
                    {
                        "source_guid": source_guid,
                        "source": source_attrs["name"],
                        "citation": source_guid_to_biblio.get(source_guid, {}).get('citation', ''),
                        "paper_title": source_guid_to_biblio.get(source_guid, {}).get('title', ''),
                        "paper_url": source_guid_to_biblio.get(source_guid, {}).get('url', ''),
                        "year": source_guid_to_biblio.get(source_guid, {}).get('year', ''),
                        "merged_subfig_num": subfig_num,
                        "quote_guid": quotation_guid,
                        "coderef_guid": c["CodeRef"]["attrs"]["targetGUID"],
                        "code_name": code_guid_to_name[
                            c["CodeRef"]["attrs"]["targetGUID"]
                        ],
                    }
                    for c in quotation["Coding"]
                ]

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
    quotes_df["fig_num"] = quotes_df["merged_subfig_num"].apply(get_fig_num)
    quotes_df["subfig_num"] = quotes_df["merged_subfig_num"].apply(get_subfig_num)
    quotes_df.to_csv(join(out_dir, "quotes.csv"), index=True)

    img_dir = join(out_dir, "images")

    # For each quotation within each source, extract the quoted region as an image file
    for source in sources:
        if source.name == "PDFSource":
            pdf_guid = source["guid"]
            pdf_file = source["path"][11:]
            pdf_path = join(pdf_dir, pdf_file)

            doc = pymupdf.open(pdf_path)

            os.makedirs(join(img_dir, pdf_guid), exist_ok=True)

            selections = source.find_all("PDFSelection")
            for selection in selections:
                sel_page = selection["page"]
                page = doc.load_page(int(sel_page))

                sel_x1 = int(selection["firstX"])
                sel_x2 = int(selection["secondX"])
                sel_y1 = page.rect.y1 - int(selection["secondY"])
                sel_y2 = page.rect.y1 - int(selection["firstY"])
                sel_guid = selection["guid"]

                mat = pymupdf.Matrix(8, 8)  # zoom factor 2 in each direction

                sel_rect = pymupdf.Rect(
                    sel_x1, sel_y1, sel_x2, sel_y2
                )  # (x0, y0, x1, y1)
                pix = page.get_pixmap(matrix=mat, clip=sel_rect)

                png_file = join(img_dir, pdf_guid, f"{sel_guid}.png")

                with open(png_file, "wb") as f:
                    f.write(pix.tobytes("png"))
        
        with open(join(out_dir, "output.json"), "w") as f:
            json.dump(project_json, f, indent=4)

    print("[green]Done[/green]")


if __name__ == "__main__":
    install()
    parser = ArgumentParser()
    parser.add_argument("--input", type=str, required=True)
    parser.add_argument("--output", type=str, required=True)
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
