# /// script
# requires-python = ">=3.8"
# dependencies = [
#     "beautifulsoup4",
#     "lxml",
# ]
# ///

"""Lista los títulos del proyecto QPDX que también aparecen en las referencias."""

import json
import os
import re
import sys
import zipfile
from argparse import ArgumentParser
from difflib import SequenceMatcher

from bs4 import BeautifulSoup


def normalize_title(value):
    """Normaliza títulos y nombres de archivo para poder compararlos."""
    value = os.path.basename(str(value or ""))
    value = re.sub(r"\.pdf$", "", value, flags=re.IGNORECASE)
    value = value.casefold()
    value = re.sub(r"[^\w\s]", " ", value)
    return re.sub(r"\s+", " ", value).strip()


def load_reference_titles(bibliography_path):
    """Carga los títulos de un archivo bibliográfico JSON/CSL-JSON."""
    with open(bibliography_path, "r", encoding="utf-8") as file:
        data = json.load(file)

    # Acepta tanto una lista CSL-JSON como {"items": [...]} o
    # {"references": [...]}.
    if isinstance(data, dict):
        data = data.get("items", data.get("references", []))

    if not isinstance(data, list):
        raise ValueError(
            "El archivo de referencias debe contener una lista de registros JSON."
        )

    titles = []
    for entry in data:
        if not isinstance(entry, dict):
            continue

        title = entry.get("title")
        if isinstance(title, list):
            title = " ".join(str(part) for part in title)

        if title and normalize_title(title):
            titles.append(str(title).strip())

    return titles


def read_qpdx_source_names(qpdx_path):
    """Obtiene los nombres de las fuentes PDF contenidas en el QPDX."""
    with zipfile.ZipFile(qpdx_path, "r") as archive:
        qde_names = [name for name in archive.namelist() if name.lower().endswith(".qde")]

        if not qde_names:
            raise ValueError("El proyecto QPDX no contiene ningún archivo .qde.")

        project_xml = None
        for qde_name in qde_names:
            contents = archive.read(qde_name)
            if b"<Project" in contents[:5000]:
                project_xml = contents
                break

    if project_xml is None:
        raise ValueError("No se encontró el XML principal <Project> dentro del QPDX.")

    soup = BeautifulSoup(project_xml, "xml")
    project = soup.find("Project")
    if project is None:
        raise ValueError("El archivo .qde no contiene un elemento <Project> válido.")

    source_names = []
    for source in project.find_all("PDFSource"):
        # 'name' suele ser el título visible. 'path' sirve como alternativa
        # cuando MAXQDA conserva allí el nombre original del PDF.
        candidates = [source.get("name", ""), source.get("path", "")]
        candidates = [candidate for candidate in candidates if normalize_title(candidate)]
        if candidates:
            source_names.append(candidates)

    return source_names


def find_matching_titles(source_names, reference_titles, min_similarity=0.85):
    """Devuelve títulos bibliográficos presentes también como fuentes del QPDX."""
    normalized_references = [
        (normalize_title(title), title) for title in reference_titles
    ]
    exact_lookup = {normalized: title for normalized, title in normalized_references}

    matches = []
    seen = set()

    for candidates in source_names:
        normalized_candidates = [normalize_title(candidate) for candidate in candidates]
        matched_title = None

        # Primero intenta una coincidencia exacta después de normalizar.
        for candidate in normalized_candidates:
            if candidate in exact_lookup:
                matched_title = exact_lookup[candidate]
                break

        # Si el nombre del PDF tiene pequeñas diferencias, busca el título más
        # parecido por encima del umbral indicado.
        if matched_title is None:
            best_score = min_similarity
            for candidate in normalized_candidates:
                for normalized_reference, reference_title in normalized_references:
                    score = SequenceMatcher(
                        None, candidate, normalized_reference
                    ).ratio()
                    if score >= best_score:
                        best_score = score
                        matched_title = reference_title

        if matched_title is not None:
            normalized_match = normalize_title(matched_title)
            if normalized_match not in seen:
                seen.add(normalized_match)
                matches.append(matched_title)

    return matches


def save_titles(titles, output_path):
    """Guarda un título por línea."""
    with open(output_path, "w", encoding="utf-8") as file:
        if titles:
            file.write("\n".join(titles) + "\n")


def main():
    parser = ArgumentParser(
        description=(
            "Lista los títulos de los trabajos incluidos en un proyecto QPDX "
            "que también aparecen en un archivo de referencias JSON."
        )
    )
    parser.add_argument("--input", required=True, help="Ruta al archivo .qpdx")
    parser.add_argument(
        "--bibliography", required=True, help="Ruta al archivo de referencias JSON"
    )
    parser.add_argument(
        "--output",
        help="Archivo .txt opcional; si se omite, la lista solo se imprime",
    )
    parser.add_argument(
        "--min-similarity",
        type=float,
        default=0.7,
        help="Umbral para coincidencias aproximadas, entre 0 y 1 (default: 0.85)",
    )
    args = parser.parse_args()

    if not 0 <= args.min_similarity <= 1:
        parser.error("--min-similarity debe estar entre 0 y 1")

    try:
        source_names = read_qpdx_source_names(args.input)
        reference_titles = load_reference_titles(args.bibliography)
        titles = find_matching_titles(
            source_names, reference_titles, args.min_similarity
        )

        if args.output:
            save_titles(titles, args.output)

        # Esta es la única salida normal del programa: un título por línea.
        for title in titles:
            print(title)
    except (OSError, ValueError, json.JSONDecodeError, zipfile.BadZipFile) as error:
        print(f"Error: {error}", file=sys.stderr)
        raise SystemExit(1) from error


if __name__ == "__main__":
    main()
