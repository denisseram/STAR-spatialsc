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
import uuid
import zipfile
import difflib
from argparse import ArgumentParser
from os.path import join

import pandas as pd
import pymupdf
from bs2json import install
from bs4 import BeautifulSoup
from rich import print


fignum_regex = r"^\d[a-zA-Z]$"

TASK_PREFIXES = (
    "Task.General Analytical Domains",
    "Task.Specific Analytical Domains",
)


def as_list(x):
    """Convert None, dict, or list values into a list."""
    if x is None:
        return []
    if isinstance(x, list):
        return x
    return [x]


def normalize_string(s):
    """Normalize a string for comparison."""
    s = str(s).lower()
    s = s.replace(".pdf", "")
    s = re.sub(r"[^\w\s]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def get_similarity_ratio(s1, s2):
    """Calculate string similarity ratio."""
    return difflib.SequenceMatcher(None, s1, s2).ratio()


def extract_year(entry):
    """Extract publication year from bibliography entry."""
    if "issued" in entry and "date-parts" in entry["issued"]:
        date_parts = entry["issued"]["date-parts"]
        if date_parts and len(date_parts[0]) > 0:
            return str(date_parts[0][0])
    return ""


def format_citation(entry):
    """Format citation as 'FirstAuthor et al., Year'."""
    citation_parts = []

    if "author" in entry and len(entry["author"]) > 0:
        first_author = entry["author"][0]
        last_name = first_author.get("family", "")

        if last_name:
            citation_parts.append(f"{last_name} et al." if len(entry["author"]) > 1 else last_name)

    year = extract_year(entry)
    if year:
        citation_parts.append(year)

    return ", ".join(citation_parts)


def load_bibliography(biblio_json_path):
    """Load bibliography data from JSON."""
    if not os.path.exists(biblio_json_path):
        print(f"[yellow]Warning: Bibliography file not found: {biblio_json_path}[/yellow]")
        return {}

    with open(biblio_json_path, "r") as f:
        biblio_data = json.load(f)

    title_lookup = {}

    for entry in biblio_data:
        if "title" not in entry:
            continue

        title_lookup[normalize_string(entry["title"])] = {
            "citation": format_citation(entry),
            "title": entry.get("title", ""),
            "url": entry.get("URL", ""),
            "year": extract_year(entry),
            "raw": entry,
        }

    return title_lookup


def match_source_to_biblio(source_name, source_attrs, title_lookup):
    """Match MAXQDA PDF source to bibliography metadata."""
    filename = source_attrs.get("name", "") or source_name

    normalized_filename = normalize_string(filename)
    normalized_source_name = normalize_string(source_name)

    if normalized_filename in title_lookup:
        return title_lookup[normalized_filename]

    if normalized_source_name in title_lookup:
        return title_lookup[normalized_source_name]

    best_match = None
    best_ratio = 0.7

    for title, biblio_info in title_lookup.items():
        ratio_filename = get_similarity_ratio(normalized_filename, title)

        if ratio_filename > best_ratio:
            best_ratio = ratio_filename
            best_match = biblio_info

        ratio_source = get_similarity_ratio(normalized_source_name, title)

        if ratio_source > best_ratio:
            best_ratio = ratio_source
            best_match = biblio_info

    return best_match


def flatten_codes(codes):
    """Flatten nested MAXQDA code structures."""
    flat = []

    for code in as_list(codes):
        flat.append(code)
        flat.extend(flatten_codes(code.get("Code", [])))

    return flat


def ensure_codebook_code_list(project_json):
    """Ensure CodeBook codes are stored as a list."""
    codes_container = project_json["Project"]["CodeBook"]["Codes"]

    if "Code" not in codes_container or codes_container["Code"] is None:
        codes_container["Code"] = []

    if isinstance(codes_container["Code"], dict):
        codes_container["Code"] = [codes_container["Code"]]

    return codes_container["Code"]


def resolve_optional_path(path_value, out_dir):
    """Resolve optional path from absolute path, current directory, or output directory."""
    if not path_value:
        return None

    if os.path.isabs(path_value) and os.path.exists(path_value):
        return path_value

    if os.path.exists(path_value):
        return path_value

    candidate = join(out_dir, path_value)
    if os.path.exists(candidate):
        return candidate

    return path_value


def create_manual_code_attrs(code_name):
    """Create minimal MAXQDA-like code attributes."""
    return {
        "guid": str(uuid.uuid4()).upper(),
        "name": code_name,
    }


def add_manual_codes_to_codebook(
    project_json,
    manual_codes_csv,
    content_codes_dir,
    code_guid_to_name,
    code_name_to_guid,
):
    """Add manual Task.* codes to CodeBook and content/codes JSON files."""
    print("\n[bold cyan]--- Manual codes debug ---[/bold cyan]")

    if not manual_codes_csv:
        print("[yellow]No manual codes CSV provided.[/yellow]")
        return {}

    print(f"[cyan]Manual codes CSV path:[/cyan] {manual_codes_csv}")

    if not os.path.exists(manual_codes_csv):
        print(f"[red]Manual codes CSV not found:[/red] {manual_codes_csv}")
        return {}

    manual_df = pd.read_csv(manual_codes_csv)

    if "code_name" not in manual_df.columns:
        raise ValueError("Manual codes CSV must contain a 'code_name' column.")

    manual_df["code_name"] = manual_df["code_name"].astype(str).str.strip()

    task_codes = sorted(
        manual_df.loc[
            manual_df["code_name"].str.startswith(TASK_PREFIXES, na=False),
            "code_name",
        ]
        .dropna()
        .unique()
    )

    print(f"[cyan]Task.* codes found in CSV:[/cyan] {len(task_codes)}")

    codes_container = project_json["Project"]["CodeBook"]["Codes"]

    if "Code" not in codes_container or codes_container["Code"] is None:
        codes_container["Code"] = []

    if isinstance(codes_container["Code"], dict):
        codes_container["Code"] = [codes_container["Code"]]

    print(f"[cyan]CodeBook codes before adding:[/cyan] {len(codes_container['Code'])}")

    added_code_name_to_guid = {}
    skipped_existing = 0

    for code_name in task_codes:
        if code_name in code_name_to_guid:
            skipped_existing += 1
            continue

        code_attrs = create_manual_code_attrs(code_name)
        code_guid = code_attrs["guid"]

        codes_container["Code"].append({"attrs": code_attrs})

        code_guid_to_name[code_guid] = code_name
        code_name_to_guid[code_name] = code_guid
        added_code_name_to_guid[code_name] = code_guid

        json_path = join(content_codes_dir, f"{code_guid}.json")

        with open(json_path, "w") as f:
            json.dump(code_attrs, f, indent=4)

        print(f"[green]Added manual code:[/green] {code_name}")
        print(f"  [green]GUID:[/green] {code_guid}")
        print(f"  [green]JSON:[/green] {json_path}")

    print(f"[cyan]CodeBook codes after adding:[/cyan] {len(codes_container['Code'])}")
    print(f"[green]New Task.* codes added:[/green] {len(added_code_name_to_guid)}")
    print(f"[yellow]Task.* codes already existing:[/yellow] {skipped_existing}")

    final_task_codes = [
        c.get("attrs", {}).get("name", "")
        for c in codes_container["Code"]
        if c.get("attrs", {}).get("name", "").startswith(TASK_PREFIXES)
    ]

    print(f"[cyan]Task.* codes now present in CodeBook:[/cyan] {len(final_task_codes)}")
    print("[bold cyan]--- End manual codes debug ---[/bold cyan]\n")

    return added_code_name_to_guid


def write_manual_codes_table_with_guids(manual_codes_csv, out_dir, code_name_to_guid):
    """Save corrected manual coded table with coderef_guid matching code_name."""
    if not manual_codes_csv or not os.path.exists(manual_codes_csv):
        return None

    manual_df = pd.read_csv(manual_codes_csv)

    if "code_name" not in manual_df.columns:
        return None

    manual_df["code_name"] = manual_df["code_name"].astype(str).str.strip()
    manual_df["coderef_guid"] = manual_df["code_name"].map(code_name_to_guid)

    output_path = join(out_dir, "quotes_with_added_task_domain_codes_with_guids.csv")
    manual_df.to_csv(output_path, index=False)

    print(f"[green]Saved corrected manual coded table:[/green] {output_path}")

    missing_guid_count = manual_df["coderef_guid"].isna().sum()
    if missing_guid_count > 0:
        print(f"[yellow]Rows without coderef_guid after mapping:[/yellow] {missing_guid_count}")

    return output_path


def inject_manual_codes_into_quotations(manual_codes_csv, content_quotations_dir):
    """Inject manual Task.* CodeRef entries into quotation JSON files."""
    print("\n[bold cyan]--- Injecting manual codes into quotation JSON files ---[/bold cyan]")

    if not manual_codes_csv or not os.path.exists(manual_codes_csv):
        print("[yellow]No manual codes CSV found for quotation injection.[/yellow]")
        return

    df = pd.read_csv(manual_codes_csv)

    required_cols = {"quote_guid", "coderef_guid", "code_name"}
    missing_cols = required_cols - set(df.columns)

    if missing_cols:
        raise ValueError(f"Manual codes CSV is missing columns: {missing_cols}")

    df["quote_guid"] = df["quote_guid"].astype(str).str.strip()
    df["coderef_guid"] = df["coderef_guid"].astype(str).str.strip()
    df["code_name"] = df["code_name"].astype(str).str.strip()

    task_df = df[
        df["code_name"].str.startswith(TASK_PREFIXES, na=False)
        & df["quote_guid"].notna()
        & df["coderef_guid"].notna()
        & (df["coderef_guid"] != "nan")
    ].drop_duplicates(subset=["quote_guid", "coderef_guid"])

    print(f"[cyan]Manual Task.* coding rows to inject:[/cyan] {len(task_df)}")

    updated_files = 0
    added_codings = 0
    missing_quotation_files = 0

    for quote_guid, group in task_df.groupby("quote_guid"):
        quotation_path = join(content_quotations_dir, f"{quote_guid}.json")

        if not os.path.exists(quotation_path):
            missing_quotation_files += 1
            print(f"[yellow]Quotation JSON not found:[/yellow] {quotation_path}")
            continue

        with open(quotation_path, "r") as f:
            quotation = json.load(f)

        existing_coding = quotation.get("Coding", [])
        existing_coding = as_list(existing_coding)

        existing_guids = {
            c.get("CodeRef", {}).get("attrs", {}).get("targetGUID")
            for c in existing_coding
        }

        file_changed = False

        for _, row in group.iterrows():
            code_guid = row["coderef_guid"]
            code_name = row["code_name"]

            if code_guid in existing_guids:
                continue

            new_coding = {
                "CodeRef": {
                    "attrs": {
                        "targetGUID": code_guid
                    }
                }
            }

            existing_coding.append(new_coding)
            existing_guids.add(code_guid)

            added_codings += 1
            file_changed = True

            print(f"[green]Injected:[/green] {code_name}")
            print(f"  [green]Quotation:[/green] {quote_guid}")
            print(f"  [green]Code GUID:[/green] {code_guid}")

        if file_changed:
            quotation["Coding"] = existing_coding

            with open(quotation_path, "w") as f:
                json.dump(quotation, f, indent=4)

            updated_files += 1

    print(f"[green]Quotation files updated:[/green] {updated_files}")
    print(f"[green]Manual codings added:[/green] {added_codings}")
    print(f"[yellow]Missing quotation files:[/yellow] {missing_quotation_files}")
    print("[bold cyan]--- Done injecting manual codes ---[/bold cyan]\n")


def extract_data(
    unzipped_dir,
    out_dir,
    biblio_json_path=None,
    manual_codes_csv=None,
    smart_code_prefix="SMART - ",
    exclude_text_quotes=True,
    exclude_fignum_codes=True,
    exclude_source_groups=None,
):
    """Extract MAXQDA project data into JSON, CSV, and image outputs."""
    if exclude_source_groups is None:
        exclude_source_groups = []

    pdf_dir = join(unzipped_dir, "sources")
    unzipped_files = os.listdir(unzipped_dir)

    qde_files = [join(unzipped_dir, f) for f in unzipped_files if f.endswith(".qde")]

    if not qde_files:
        raise ValueError("No .qde files found.")

    qde_file = None

    for fpath in qde_files:
        with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
            if "<Project" in f.read(5000):
                qde_file = fpath
                break

    if qde_file is None:
        raise ValueError("Could not find main .qde file containing <Project>.")

    print(f"[green]Using QDE file:[/green] {qde_file}")

    with open(qde_file) as f:
        soup = BeautifulSoup(f, "xml")

    project = soup.find("Project")
    sources = project.find("Sources")
    project_json = project.to_json()

    title_lookup = {}

    if biblio_json_path:
        biblio_json_path = resolve_optional_path(biblio_json_path, out_dir)
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

    root_codes = ensure_codebook_code_list(project_json)

    code_names_to_ignore = []
    code_guids_to_ignore = []
    fignum_code_guids = {}

    for code in root_codes:
        code_attrs = code["attrs"]
        code_name = code_attrs["name"]

        if code_name.startswith(smart_code_prefix):
            code_names_to_ignore.append(code_name[len(smart_code_prefix):])

        if exclude_fignum_codes and re.match(fignum_regex, code_name):
            code_names_to_ignore.append(code_name)
            fignum_code_guids[code_attrs["guid"]] = code_name

    all_codes = flatten_codes(root_codes)

    for code in all_codes:
        code_attrs = code["attrs"]
        if code_attrs["name"] in code_names_to_ignore:
            code_guids_to_ignore.append(code_attrs["guid"])

    code_guid_to_name = {}
    code_name_to_guid = {}

    for code in all_codes:
        code_attrs = code["attrs"]
        code_name = code_attrs["name"]

        if code_name.startswith(smart_code_prefix):
            code_name = code_name[len(smart_code_prefix):]
            code_attrs["name"] = code_name

        code_guid = code_attrs["guid"]

        code_guid_to_name[code_guid] = code_name
        code_name_to_guid[code_name] = code_guid

        if code_guid not in code_guids_to_ignore:
            with open(join(content_codes_dir, f"{code_guid}.json"), "w") as f:
                json.dump(code_attrs, f, indent=4)

    manual_codes_csv = resolve_optional_path(manual_codes_csv, out_dir)

    add_manual_codes_to_codebook(
        project_json=project_json,
        manual_codes_csv=manual_codes_csv,
        content_codes_dir=content_codes_dir,
        code_guid_to_name=code_guid_to_name,
        code_name_to_guid=code_name_to_guid,
    )

    manual_codes_with_guids_csv = write_manual_codes_table_with_guids(
        manual_codes_csv=manual_codes_csv,
        out_dir=out_dir,
        code_name_to_guid=code_name_to_guid,
    )

    source_group_name_to_member_source_guids = {}

    for code_or_source_group in as_list(project_json["Project"].get("Sets", {}).get("Set", [])):
        if "MemberCode" in code_or_source_group:
            set_guid = code_or_source_group["attrs"]["guid"]

            with open(join(content_code_groups_dir, f"{set_guid}.json"), "w") as f:
                json.dump(code_or_source_group, f, indent=4)

        if "MemberSource" in code_or_source_group:
            set_attrs = code_or_source_group["attrs"]
            set_guid = set_attrs["guid"]
            source_group_name = set_attrs["name"]

            source_group_name_to_member_source_guids[source_group_name] = [
                member["attrs"]["targetGUID"]
                for member in as_list(code_or_source_group["MemberSource"])
            ]

            with open(join(content_source_groups_dir, f"{set_guid}.json"), "w") as f:
                json.dump(code_or_source_group, f, indent=4)

    source_guid_to_biblio = {}
    matched_sources = 0
    total_sources = 0
    quotes_rows = []

    pdf_sources = as_list(project_json["Project"]["Sources"].get("PDFSource", []))

    for source in pdf_sources:
        source_attrs = source["attrs"]
        source_guid = source_attrs["guid"]
        source_name = source_attrs["name"]

        total_sources += 1

        skip_source = False

        for source_group_name in exclude_source_groups:
            member_guids = source_group_name_to_member_source_guids.get(source_group_name, [])
            if source_guid in member_guids:
                skip_source = True

        if skip_source:
            continue

        if biblio_json_path:
            biblio_info = match_source_to_biblio(source_name, source_attrs, title_lookup)

            if biblio_info:
                matched_sources += 1
                source_guid_to_biblio[source_guid] = biblio_info

                source_attrs["bibliography"] = {
                    "citation": biblio_info["citation"],
                    "title": biblio_info["title"],
                    "url": biblio_info["url"],
                    "year": biblio_info["year"],
                }

        with open(join(content_sources_dir, f"{source_guid}.json"), "w") as f:
            json.dump(source_attrs, f, indent=4)

        if "PDFSelection" not in source:
            continue

        source["PDFSelection"] = as_list(source["PDFSelection"])

        for quotation in source["PDFSelection"]:
            if "Coding" not in quotation:
                continue

            quotation_attrs = quotation["attrs"]
            quotation_guid = quotation_attrs["guid"]
            quotation_name = quotation_attrs["name"]

            quotation["source_guid"] = source_guid

            is_text_quote = "\u00d7" not in quotation_name

            if exclude_text_quotes and is_text_quote:
                continue

            subfig_num = None
            quotation["Coding"] = as_list(quotation["Coding"])

            cleaned_codes_for_quotation = []

            for c in quotation["Coding"]:
                code_guid = c["CodeRef"]["attrs"]["targetGUID"]

                if code_guid not in code_guids_to_ignore:
                    cleaned_codes_for_quotation.append(c)

                if code_guid in fignum_code_guids:
                    subfig_num = fignum_code_guids[code_guid]

            quotation["Coding"] = cleaned_codes_for_quotation
            quotation["subfig_num"] = subfig_num

            with open(join(content_quotations_dir, f"{quotation_guid}.json"), "w") as f:
                json.dump(quotation, f, indent=4)

            for c in quotation["Coding"]:
                code_guid = c["CodeRef"]["attrs"]["targetGUID"]

                quotes_rows.append(
                    {
                        "source_guid": source_guid,
                        "source": source_attrs["name"],
                        "citation": source_guid_to_biblio.get(source_guid, {}).get("citation", ""),
                        "paper_title": source_guid_to_biblio.get(source_guid, {}).get("title", ""),
                        "paper_url": source_guid_to_biblio.get(source_guid, {}).get("url", ""),
                        "year": source_guid_to_biblio.get(source_guid, {}).get("year", ""),
                        "merged_subfig_num": subfig_num,
                        "quote_guid": quotation_guid,
                        "coderef_guid": code_guid,
                        "code_name": code_guid_to_name[code_guid],
                    }
                )

    if manual_codes_with_guids_csv:
        inject_manual_codes_into_quotations(
            manual_codes_csv=manual_codes_with_guids_csv,
            content_quotations_dir=content_quotations_dir,
        )

    if biblio_json_path:
        print(f"[green]Bibliography matching: {matched_sources}/{total_sources} sources matched[/green]")

    quotes_df = pd.DataFrame(data=quotes_rows)

    if not quotes_df.empty:
        quotes_df["fig_num"] = quotes_df["merged_subfig_num"].apply(
            lambda x: str(x)[0] if x is not None and len(str(x)) >= 1 else None
        )
        quotes_df["subfig_num"] = quotes_df["merged_subfig_num"].apply(
            lambda x: str(x)[1] if x is not None and len(str(x)) == 2 else None
        )

    quotes_df.to_csv(join(out_dir, "quotes.csv"), index=True)

    img_dir = join(out_dir, "images")

    for source in sources:
        if source.name != "PDFSource":
            continue

        pdf_guid = source["guid"]
        pdf_file = source["path"][11:]
        pdf_path = join(pdf_dir, pdf_file)

        doc = pymupdf.open(pdf_path)

        os.makedirs(join(img_dir, pdf_guid), exist_ok=True)

        for selection in source.find_all("PDFSelection"):
            page = doc.load_page(int(selection["page"]))

            sel_x1 = int(selection["firstX"])
            sel_x2 = int(selection["secondX"])
            sel_y1 = page.rect.y1 - int(selection["secondY"])
            sel_y2 = page.rect.y1 - int(selection["firstY"])
            sel_guid = selection["guid"]

            mat = pymupdf.Matrix(8, 8)
            sel_rect = pymupdf.Rect(sel_x1, sel_y1, sel_x2, sel_y2)
            pix = page.get_pixmap(matrix=mat, clip=sel_rect)

            png_file = join(img_dir, pdf_guid, f"{sel_guid}.png")

            with open(png_file, "wb") as f:
                f.write(pix.tobytes("png"))

    final_codebook_codes = project_json["Project"]["CodeBook"]["Codes"]["Code"]

    final_task_codes = [
        c.get("attrs", {}).get("name", "")
        for c in final_codebook_codes
        if c.get("attrs", {}).get("name", "").startswith(TASK_PREFIXES)
    ]

    print(f"[bold green]Final Task.* codes written to output.json:[/bold green] {len(final_task_codes)}")

    with open(join(out_dir, "output.json"), "w") as f:
        json.dump(project_json, f, indent=4)

    print("[green]Done[/green]")


if __name__ == "__main__":
    install()

    parser = ArgumentParser()

    parser.add_argument("--input", type=str, required=True)
    parser.add_argument("--output", type=str, required=True)
    parser.add_argument("--bibliography", type=str)
    parser.add_argument("--manual-codes-csv", type=str)
    parser.add_argument("--exclude-source-groups", nargs="*", default=[])

    args = parser.parse_args()

    unzipped_dir = join(args.output, "unzipped")
    out_dir = args.output

    os.makedirs(out_dir, exist_ok=True)

    with zipfile.ZipFile(args.input, "r") as zip_ref:
        zip_ref.extractall(unzipped_dir)

    extract_data(
        unzipped_dir=unzipped_dir,
        out_dir=out_dir,
        biblio_json_path=args.bibliography,
        manual_codes_csv=args.manual_codes_csv,
        exclude_source_groups=args.exclude_source_groups,
    )