######## V I Z U A L I Z A T I O N ########

import os
import re
import textwrap
import xml.etree.ElementTree as ET
from difflib import get_close_matches

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib as mpl

from matplotlib.patches import PathPatch
from matplotlib.transforms import Affine2D
from svgpath2mpl import parse_path


#mpl.rcParams["font.family"] = "Roboto"
#mpl.rcParams["pdf.fonttype"] = 42
#mpl.rcParams["ps.fonttype"] = 42


# =========================
# Configuración
# =========================
code_col = "code_name"
svg_folder = "svg"

prefix = "Visualization."

bg_color = "#BFE5D9"
icon_color = "#43B394"
line_color = "#D0D0D0"

fixed_radius = 0.65

# Loading-bar configuration
BAR_TOTAL = 1.20
BAR_MAX_FIGURES = 1824
bar_bg_color = "#E6E6E6"
bar_width = 0.075

icon_vector_size = 0.62


# =========================
# Preparar datos
# =========================
viz = df_clean[df_clean[code_col].astype(str).str.startswith(prefix)].copy()

viz["taxonomy_path"] = viz[code_col].str.replace(
    f"^{re.escape(prefix)}", "", regex=True
)

viz[["title", "code"]] = viz["taxonomy_path"].str.split(".", n=1, expand=True)
viz = viz.dropna(subset=["title", "code"])

freq = (
    viz.groupby(["title", "code"])
    .size()
    .reset_index(name="frequency")
)

chart_top4 = (
    freq[freq["title"] == "Chart Type"]
    .sort_values("frequency", ascending=False)
    .head(4)
)

freq = pd.concat([
    freq[freq["title"] != "Chart Type"],
    chart_top4
], ignore_index=True)


# =========================
# Frequency scale
# =========================
def scale_bar_length(frequency):
    """Map frequency to filled bar length, where 1824 = full bar."""
    return min(frequency / BAR_MAX_FIGURES, 1) * BAR_TOTAL


# =========================
# Búsqueda flexible de SVGs
# =========================
def normalize_name(text):
    text = str(text).lower()
    text = text.replace(".svg", "")
    text = text.replace("visualization", "")
    text = text.replace("summay", "summary")
    text = text.replace("item-level", "item level")
    text = text.replace("itemlevel", "item level")
    text = re.sub(r"[^a-z0-9]+", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


svg_files = [
    f for f in os.listdir(svg_folder)
    if f.lower().endswith(".svg")
]

svg_lookup = {
    normalize_name(f): f
    for f in svg_files
}


def find_svg_file(title, code):
    target = normalize_name(f"{title} {code}")

    if target in svg_lookup:
        return svg_lookup[target]

    matches = get_close_matches(
        target,
        svg_lookup.keys(),
        n=1,
        cutoff=0.50
    )

    if matches:
        return svg_lookup[matches[0]]

    return None


# =========================
# SVG como vector
# =========================
def load_svg_paths(svg_path):
    tree = ET.parse(svg_path)
    root = tree.getroot()

    paths = []

    for elem in root.iter():
        if elem.tag.endswith("path") and elem.get("d"):
            paths.append(parse_path(elem.get("d")))

    return paths


def draw_svg_icon(ax, svg_path, x, y, size=0.62, color=icon_color):
    paths = load_svg_paths(svg_path)

    if not paths:
        return False

    all_bboxes = [p.get_extents() for p in paths]
    x0 = min(b.x0 for b in all_bboxes)
    y0 = min(b.y0 for b in all_bboxes)
    x1 = max(b.x1 for b in all_bboxes)
    y1 = max(b.y1 for b in all_bboxes)

    width = x1 - x0
    height = y1 - y0

    if width == 0 or height == 0:
        return False

    scale = size / max(width, height)

    transform = (
        Affine2D()
        .translate(-(x0 + width / 2), -(y0 + height / 2))
        .scale(scale, -scale)
        .translate(x, y)
        + ax.transData
    )

    for path in paths:
        patch = PathPatch(
            path,
            facecolor=color,
            edgecolor="none",
            transform=transform,
            zorder=2
        )
        ax.add_patch(patch)

    return True


# =========================
# Layout
# =========================
section_layout = {
    "Layout": {
        "origin": (1.8, 8.4),
        "cols": 6,
        "width": 10.0
    },
    "Abstraction": {
        "origin": (12.4, 8.4),
        "cols": 3,
        "width": 5
    },
    "Scalability Strategy": {
        "origin": (1.8, 4.9),
        "cols": 4,
        "width": 6.7
    },
    "Communicative/Contextualization": {
        "origin": (9.1, 4.9),
        "cols": 4,
        "width": 6.7
    },
    "Comparative Design": {
        "origin": (1.8, 1.4),
        "cols": 4,
        "width": 6.7
    },
    "Chart Type": {
        "origin": (9.1, 1.4),
        "cols": 5,
        "width": 8.3
    }
}


code_order = {
    "Layout": [
        "Linear",
        "Circular",
        "Space-filling",
        "Force-directed",
        "Spatial : Latent",
        "Spatial : Physical"
    ],
    "Abstraction": [
        "None",
        "Partial",
        "Complete"
    ],
    "Scalability Strategy": [
        "None (Item-level)",
        "Summay/Aggregate",
        "Sampling/Filtering",
        "Navigating (Focus + Context)"
    ],
    "Communicative/Contextualization": [
        "None",
        "Annotation",
        "Highlighting",
        "Reference structure"
    ],
    "Comparative Design": [
        "None",
        "Juxtaposition",
        "Superposition",
        "Explicit encoding"
    ]
}


def wrap_label(text, width=16):
    text = str(text)
    text = text.replace("Summay/Aggregate", "Summary/\nAggregate")
    text = text.replace("Sampling/Filtering", "Sampling/\nFiltering")
    text = text.replace("Navigating (Focus + Context)", "Navigating\n(Focus + Context)")
    text = text.replace("Navigation (focus + context)", "Navigation\n(focus + context)")
    return "\n".join(textwrap.wrap(text, width=width))


# =========================
# Plot
# =========================
fig, ax = plt.subplots(figsize=(18, 11.7))
ax.set_aspect("equal")
ax.axis("off")

missing_svgs = []

LABEL_GAP = 0.13
BAR_GAP = 0.03
N_LABEL_GAP = 0.03

MAX_LABEL_LINES = 3
LABEL_LINE_H = 0.20
FIXED_LABEL_H = MAX_LABEL_LINES * LABEL_LINE_H


def draw_section(title, origin, cols, width):
    x0, y0 = origin

    subset = freq[freq["title"] == title].copy()

    if subset.empty:
        return

    if title in code_order:
        order_map = {c: i for i, c in enumerate(code_order[title])}
        subset["order"] = subset["code"].map(order_map)
        subset = subset.dropna(subset=["order"]).sort_values("order")
    else:
        subset = subset.sort_values("frequency", ascending=False)

    ax.text(
        x0,
        y0 + 1.05,
        title,
        fontsize=22,
        color=icon_color,
        ha="left",
        va="center"
    )

    ax.plot(
        [x0, x0 + width],
        [y0 + 0.72, y0 + 0.72],
        color=line_color,
        linewidth=1.8
    )

    x_spacing = width / cols

    circle_top_padding = 0.25
    row_gap = 2.2
    first_row_y = y0 + 0.72 - fixed_radius - circle_top_padding

    for i, row in subset.reset_index(drop=True).iterrows():
        col = i % cols
        row_i = i // cols

        cx = x0 + col * x_spacing + x_spacing / 2
        cy = first_row_y - row_i * row_gap

        code = row["code"]
        frequency = row["frequency"]

        circle = plt.Circle(
            (cx, cy),
            fixed_radius,
            color=bg_color,
            ec="none",
            zorder=1
        )
        ax.add_patch(circle)

        svg_name = find_svg_file(title, code)
        svg_path = os.path.join(svg_folder, svg_name) if svg_name else None

        if svg_path and os.path.exists(svg_path):
            ok = draw_svg_icon(
                ax,
                svg_path,
                cx,
                cy,
                size=icon_vector_size,
                color=icon_color
            )
            if not ok:
                missing_svgs.append(f"{title} / {code} -- SVG sin paths")
                ax.text(
                    cx,
                    cy,
                    "?",
                    fontsize=24,
                    color=icon_color,
                    ha="center",
                    va="center",
                    zorder=2
                )
        else:
            missing_svgs.append(f"{title} / {code}")
            ax.text(
                cx,
                cy,
                "?",
                fontsize=24,
                color=icon_color,
                ha="center",
                va="center",
                zorder=2
            )

        label_text = wrap_label(code, width=14)
        label_y_center = (
            cy
            - fixed_radius
            - LABEL_GAP
            - FIXED_LABEL_H / 2
        )

        ax.text(
            cx,
            label_y_center,
            label_text,
            fontsize=12,
            ha="center",
            va="center",
            color="black",
            linespacing=1.3
        )

        # Fixed bar position per row
        bar_y_top = (
            cy
            - fixed_radius
            - LABEL_GAP
            - FIXED_LABEL_H
            - BAR_GAP
        )

        bar_x_left = cx - BAR_TOTAL / 2
        filled_length = scale_bar_length(frequency)

        # Background loading bar
        bar_bg = plt.Rectangle(
            (bar_x_left, bar_y_top - bar_width),
            BAR_TOTAL,
            bar_width,
            color=bar_bg_color,
            zorder=1.5
        )
        ax.add_patch(bar_bg)

        # Filled loading bar
        bar_fill = plt.Rectangle(
            (bar_x_left, bar_y_top - bar_width),
            filled_length,
            bar_width,
            color=icon_color,
            zorder=2
        )
        ax.add_patch(bar_fill)

        ax.text(
            cx,
            bar_y_top - bar_width - N_LABEL_GAP,
            f"n = {frequency}",
            fontsize=10,
            ha="center",
            va="top",
            color=icon_color
        )

    if title == "Chart Type":
        i = len(subset)
        col = i % cols
        row_i = i // cols

        cx = x0 + col * x_spacing + x_spacing / 2
        cy = first_row_y - row_i * row_gap

        circle = plt.Circle(
            (cx, cy),
            fixed_radius,
            color=bg_color,
            ec="none",
            zorder=1
        )
        ax.add_patch(circle)

        ax.text(
            cx,
            cy,
            "...",
            fontsize=26,
            ha="center",
            va="center",
            color=icon_color,
            zorder=2
        )

        ax.text(
            cx,
            cy - fixed_radius - LABEL_GAP,
            "More",
            fontsize=12,
            ha="center",
            va="top",
            color="black"
          )


for section, params in section_layout.items():
    draw_section(
        title=section,
        origin=params["origin"],
        cols=params["cols"],
        width=params["width"]
    )


# =========================
# Título vertical izquierdo
# =========================
ax.text(
    0.5,
    4.9,
    "How: Visualization Taxonomy",
    fontsize=28,
    color=icon_color,
    rotation=90,
    ha="center",
    va="center"
)

ax.plot(
    [1.0, 1.0],
    [0.2, 9.4],
    color=icon_color,
    linewidth=2
)

ax.set_xlim(0, 18)
ax.set_ylim(-0.6, 9.7)

plt.tight_layout()

plt.savefig(
    "visualization_taxonomy_frequency_horizontal.png",
    dpi=300,
    bbox_inches="tight"
)

plt.savefig(
    "visualization_taxonomy_frequency_horizontal.pdf",
    bbox_inches="tight"
)

plt.savefig(
    "visualization_taxonomy_frequency_horizontal.svg",
    bbox_inches="tight"
)

plt.show()


# =========================
# Debug
# =========================
if missing_svgs:
    print("SVGs no encontrados o no vectorizables:")
    for s in missing_svgs:
        print(s)


############ D A T A ###################

# Data taxonomy figure
# Same visual style as the Visualization taxonomy script, adapted for Data taxonomy.
# Requires: df_clean dataframe, svgpath2mpl, and SVG files in ./svg_data

import os
import re
import textwrap
import xml.etree.ElementTree as ET
from difflib import get_close_matches

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib as mpl

from matplotlib.patches import PathPatch
from matplotlib.transforms import Affine2D
from svgpath2mpl import parse_path


# =========================
# Configuración general
# =========================
code_col = "code_name"
svg_folder = "svg_data"

prefix = "Data."

bg_color = "#F4C7B8"
icon_color = "#E64E1F"
line_color = "#D0D0D0"

fixed_radius = 0.65

# Loading-bar configuration
BAR_TOTAL = 1.20
BAR_MAX_FIGURES = 1824
bar_bg_color = "#E6E6E6"
bar_width = 0.075

icon_vector_size = 0.62


# =========================
# Fuente
# =========================
mpl.rcParams["font.family"] = "sans-serif"
mpl.rcParams["font.sans-serif"] = ["Helvetica", "Arial", "DejaVu Sans"]
mpl.rcParams["pdf.fonttype"] = 42
mpl.rcParams["ps.fonttype"] = 42


# =========================
# Preparar datos
# =========================
data = df_clean[df_clean[code_col].astype(str).str.startswith(prefix)].copy()

data["taxonomy_path"] = data[code_col].str.replace(
    f"^{re.escape(prefix)}", "", regex=True
)

data[["title", "code"]] = data["taxonomy_path"].str.split(".", n=1, expand=True)
data = data.dropna(subset=["title", "code"])

# =========================
# Reglas especiales para Modality
# =========================
modality_to_merge_into_multiomics = {
    "ATAC-seq",
    "Genomics",
    "Proteomics",
    "Spatial proteomics",
    "bulk RNA-seq",
    "scRNA-seq",
    "snRNA-seq"
}

# Unir modalidades dentro de Multi-omics
mask_modality_merge = (
    (data["title"] == "Modality") &
    (data["code"].isin(modality_to_merge_into_multiomics))
)
data.loc[mask_modality_merge, "code"] = "Multi-omics"

# Eliminar Out of scope
data = data[
    ~(
        (data["title"] == "Modality") &
        (data["code"] == "Out of scope")
    )
].copy()

freq = (
    data.groupby(["title", "code"])
    .size()
    .reset_index(name="frequency")
)


# =========================
# Frequency scale
# =========================
def scale_bar_length(frequency):
    """Map frequency to filled bar length, where 1824 = full bar."""
    return min(frequency / BAR_MAX_FIGURES, 1) * BAR_TOTAL


# =========================
# Búsqueda flexible de SVGs
# =========================
def normalize_name(text):
    text = str(text).lower()
    text = text.replace(".svg", "")
    text = text.replace("data", "")

    text = text.replace("n/a", "na")
    text = text.replace("rna-seq", "rna seq")
    text = text.replace("scrna-seq", "scrna seq")
    text = text.replace("snrna-seq", "snrna seq")
    text = text.replace("atac-seq", "atac seq")
    text = text.replace("multi-omics", "multi omics")
    text = text.replace("sequencing-based", "sequencing based")
    text = text.replace("imaging-based", "imaging based")
    text = text.replace("spatial proteomics", "spatial proteomics")

    text = re.sub(r"[^a-z0-9]+", " ", text)
    text = re.sub(r"\s+", " ", text)

    return text.strip()


svg_files = [
    f for f in os.listdir(svg_folder)
    if f.lower().endswith(".svg")
]

svg_lookup = {
    normalize_name(f): f
    for f in svg_files
}


def find_svg_file(title, code):
    candidates = [
        f"{title} {code}",
        code,
        code.split(".")[-1],
    ]

    for candidate in candidates:
        target = normalize_name(candidate)

        if target in svg_lookup:
            return svg_lookup[target]

        matches = get_close_matches(
            target,
            svg_lookup.keys(),
            n=1,
            cutoff=0.50
        )

        if matches:
            return svg_lookup[matches[0]]

    return None


# =========================
# SVG como vector
# =========================
def load_svg_paths(svg_path):
    tree = ET.parse(svg_path)
    root = tree.getroot()

    paths = []

    for elem in root.iter():
        if elem.tag.endswith("path") and elem.get("d"):
            paths.append(parse_path(elem.get("d")))

    return paths


def draw_svg_icon(ax, svg_path, x, y, size=0.62, color=icon_color):
    paths = load_svg_paths(svg_path)

    if not paths:
        return False

    all_bboxes = [p.get_extents() for p in paths]
    x0 = min(b.x0 for b in all_bboxes)
    y0 = min(b.y0 for b in all_bboxes)
    x1 = max(b.x1 for b in all_bboxes)
    y1 = max(b.y1 for b in all_bboxes)

    width = x1 - x0
    height = y1 - y0

    if width == 0 or height == 0:
        return False

    scale = size / max(width, height)

    transform = (
        Affine2D()
        .translate(-(x0 + width / 2), -(y0 + height / 2))
        .scale(scale, -scale)
        .translate(x, y)
        + ax.transData
    )

    for path in paths:
        patch = PathPatch(
            path,
            facecolor=color,
            edgecolor="none",
            transform=transform,
            zorder=2
        )
        ax.add_patch(patch)

    return True


# =========================
# Layout según tu boceto
# =========================
section_layout = {
    "Modality": {
        "origin": (1.8, 17.1),
        "cols": 5,
        "width": 8.3
    },
    "Resolution of observation": {
        "origin": (1.8, 13.1),
        "cols": 6,
        "width": 10
    },
    "Condition Dimension": {
        "origin": (10.7, 17.1),
        "cols": 4,
        "width": 6.6
    },
    "Data Components": {
        "origin": (1.8, 9.1),
        "cols": 9,
        "width": 16.3
    },
    "Visualized Elements": {
        "origin": (1.8, 5.1),
        "cols": 5,
        "width": 8.2
    },
    "Metadata": {
        "origin": (10.5, 5.1),
        "cols": 4,
        "width": 7.6
    }
}


# =========================
# Orden interno de los códigos
# =========================
code_order = {
    "Modality": [
        "Imaging-based",
        "Multi-omics",
        "Sequencing-based",
        "Sequencing-based: Deconvolved data",
        "Simulated"
    ],
    "Resolution of observation": [
        "Cellular",
        "Field of view",
        "Functional tissue unit",
        "Molecular",
        "Multi-cellular",
        "Sub-cellular"
    ],
    "Condition Dimension": [
        "Categorical",
        "N/A",
        "Ordered.Continuos",
        "Ordered.Discrete"
    ],
    "Data Components": [
        "Biological Annotation",
        "Clinical data",
        "Evaluation metrics",
        "Gene Expression Matrix",
        "Pseudotime",
        "Spatial Coordinates.3D reconstructed",
        "Spatial Coordinates.Native 2D",
        "Spatial Coordinates.True 3D",
        "Spatial Coordinates.Virtual 2D",
        "Statistic",
        "Time"
    ],
    "Visualized Elements": [
        "Feature",
        "Observation",
        "Relationship",
        "Statistic",
        "Tissue unit/Structure"
    ],
    "Metadata": [
        "Experimental.Biological status",
        "Experimental.Disease state",
        "Experimental.Donor",
        "Experimental.Sample",
        "Experimental.Tissue",
        "Experimental.Treatment group",
        "None",
        "Technical"
    ]
}


# =========================
# Labels
# =========================
label_replacements = {
    "Ordered.Continuos": "Ordered\nContinuous",
    "Ordered.Discrete": "Ordered\nDiscrete",

    "Sequencing-based: Deconvolved data": "Sequencing-based\nDeconvolved data",

    "Spatial Coordinates.3D reconstructed": "Spatial Coordinates\n3D reconstructed",
    "Spatial Coordinates.Native 2D": "Spatial Coordinates\nNative 2D",
    "Spatial Coordinates.True 3D": "Spatial Coordinates\nTrue 3D",
    "Spatial Coordinates.Virtual 2D": "Spatial Coordinates\nVirtual 2D",

    "Experimental.Biological status": "Experimental\nBiological status",
    "Experimental.Disease state": "Experimental\nDisease state",
    "Experimental.Donor": "Experimental\nDonor",
    "Experimental.Sample": "Experimental\nSample",
    "Experimental.Tissue": "Experimental\nTissue",
    "Experimental.Treatment group": "Experimental\nTreatment group",

    "Resolution of observation": "Resolution of observation",
    "Tissue unit/Structure": "Tissue unit/\nStructure",
    "Functional tissue unit": "Functional\ntissue unit",
    "Field of view": "Field of\nview",
}


section_title_replacements = {
    "Resolution of observation": "Resolution of observation"
}


def wrap_label(text, width=14):
    text = str(text)

    if text in label_replacements:
        text = label_replacements[text]
    else:
        text = text.replace(".", "\n")

    wrapped_lines = []

    for line in text.split("\n"):
        wrapped_lines.extend(textwrap.wrap(line, width=width) or [""])

    return "\n".join(wrapped_lines)


# =========================
# Plot
# =========================
fig, ax = plt.subplots(figsize=(18, 15.6))
ax.set_aspect("equal")
ax.axis("off")

missing_svgs = []

LABEL_GAP = 0.13
BAR_GAP = 0.30
N_LABEL_GAP = 0.03

MAX_LABEL_LINES = 3
LABEL_LINE_H = 0.20
FIXED_LABEL_H = MAX_LABEL_LINES * LABEL_LINE_H

row_gap = 2.2


def draw_plus_symbol(ax, cx, cy):
    circle = plt.Circle(
        (cx, cy),
        fixed_radius,
        color=bg_color,
        ec="none",
        zorder=1
    )
    ax.add_patch(circle)

    ax.text(
        cx,
        cy,
        "+",
        fontsize=36,
        fontweight="bold",
        ha="center",
        va="center",
        color=icon_color,
        zorder=2
    )

    ax.text(
        cx,
        cy - fixed_radius - LABEL_GAP,
        "More",
        fontsize=12,
        ha="center",
        va="top",
        color="black"
    )


def draw_section(title, origin, cols, width):
    x0, y0 = origin

    subset = freq[freq["title"] == title].copy()

    if subset.empty:
        return

    show_plus = False

    # =========================
    # Orden / filtro especial
    # =========================
    if title == "Metadata":
        subset = subset.sort_values("frequency", ascending=False)
        show_plus = len(subset) > 3
        subset = subset.head(3)

    elif title in code_order:
        order_map = {c: i for i, c in enumerate(code_order[title])}
        subset["order"] = subset["code"].map(order_map)
        subset["_missing_order"] = subset["order"].isna()

        subset = subset.sort_values(
            by=["_missing_order", "order", "frequency", "code"],
            ascending=[True, True, False, True]
        )
    else:
        subset = subset.sort_values("frequency", ascending=False)

    display_title = section_title_replacements.get(title, title)

    ax.text(
        x0,
        y0 + 1.05,
        display_title,
        fontsize=22,
        color=icon_color,
        ha="left",
        va="center",
        linespacing=0.95
    )

    ax.plot(
        [x0, x0 + width],
        [y0 + 0.72, y0 + 0.72],
        color=line_color,
        linewidth=1.8
    )

    x_spacing = width / cols

    circle_top_padding = 0.25
    first_row_y = y0 + 0.72 - fixed_radius - circle_top_padding

    for i, row in subset.reset_index(drop=True).iterrows():
        col = i % cols
        row_i = i // cols

        cx = x0 + col * x_spacing + x_spacing / 2
        cy = first_row_y - row_i * row_gap

        code = row["code"]
        frequency = row["frequency"]

        circle = plt.Circle(
            (cx, cy),
            fixed_radius,
            color=bg_color,
            ec="none",
            zorder=1
        )
        ax.add_patch(circle)

        svg_name = find_svg_file(title, code)
        svg_path = os.path.join(svg_folder, svg_name) if svg_name else None

        if svg_path and os.path.exists(svg_path):
            ok = draw_svg_icon(
                ax,
                svg_path,
                cx,
                cy,
                size=icon_vector_size,
                color=icon_color
            )

            if not ok:
                missing_svgs.append(f"{title} / {code} -- SVG sin paths")
                ax.text(
                    cx,
                    cy,
                    "?",
                    fontsize=24,
                    color=icon_color,
                    ha="center",
                    va="center",
                    zorder=2
                )
        else:
            missing_svgs.append(f"{title} / {code}")
            ax.text(
                cx,
                cy,
                "?",
                fontsize=24,
                color=icon_color,
                ha="center",
                va="center",
                zorder=2
            )

        label_text = wrap_label(code, width=14)
        label_y_center = (
            cy
            - fixed_radius
            - LABEL_GAP
            - FIXED_LABEL_H / 2
        )

        ax.text(
            cx,
            label_y_center,
            label_text,
            fontsize=12,
            ha="center",
            va="center",
            color="black",
            linespacing=1.3
        )

        bar_y_top = (
            cy
            - fixed_radius
            - LABEL_GAP
            - FIXED_LABEL_H
            - BAR_GAP
        )

        bar_x_left = cx - BAR_TOTAL / 2
        filled_length = scale_bar_length(frequency)

        # Background loading bar
        bar_bg = plt.Rectangle(
            (bar_x_left, bar_y_top - bar_width),
            BAR_TOTAL,
            bar_width,
            color=bar_bg_color,
            zorder=1.5
        )
        ax.add_patch(bar_bg)

        # Filled loading bar
        bar_fill = plt.Rectangle(
            (bar_x_left, bar_y_top - bar_width),
            filled_length,
            bar_width,
            color=icon_color,
            zorder=2
        )
        ax.add_patch(bar_fill)

        ax.text(
            cx,
            bar_y_top - bar_width - N_LABEL_GAP,
            f"n = {frequency}",
            fontsize=10,
            ha="center",
            va="top",
            color=icon_color
        )

    # =========================
    # Signo de más para Metadata
    # =========================
    if show_plus:
        i = len(subset)
        col = i % cols
        row_i = i // cols

        cx = x0 + col * x_spacing + x_spacing / 2
        cy = first_row_y - row_i * row_gap

        draw_plus_symbol(ax, cx, cy)


for section, params in section_layout.items():
    draw_section(
        title=section,
        origin=params["origin"],
        cols=params["cols"],
        width=params["width"]
    )


# =========================
# Título vertical izquierdo
# =========================
ax.text(
    0.5,
    9.8,
    "What: Data Taxonomy",
    fontsize=28,
    color=icon_color,
    rotation=90,
    ha="center",
    va="center"
)

ax.plot(
    [1.0, 1.0],
    [3.5, 18],
    color=icon_color,
    linewidth=2
)

ax.set_xlim(0, 18.8)
ax.set_ylim(2.1, 18.4)

plt.tight_layout()

plt.savefig(
    "data_taxonomy_frequency_horizontal.png",
    dpi=300,
    bbox_inches="tight"
)

plt.savefig(
    "data_taxonomy_frequency_horizontal.pdf",
    bbox_inches="tight"
)

plt.savefig(
    "data_taxonomy_frequency_horizontal.svg",
    bbox_inches="tight"
)

plt.show()


# =========================
# Debug
# =========================
if missing_svgs:
    print("SVGs no encontrados o no vectorizables:")
    for s in missing_svgs:
        print(s)

########## T A S K ######


import os
import re
import textwrap
import argparse
import xml.etree.ElementTree as ET
from difflib import get_close_matches

import pandas as pd
import matplotlib.pyplot as plt
import matplotlib as mpl

from matplotlib.patches import PathPatch
from matplotlib.transforms import Affine2D
from svgpath2mpl import parse_path


# ============================================================
# GLOBAL STYLE — keep these values identical across figures
# ============================================================
code_col = "code_name"

# Folder containing the SVG icons for this taxonomy
svg_folder = "svg_task"

# Taxonomy prefix to filter
prefix = "Task."

# Requested colors for Task
bg_color = "#fdd8a3"
icon_color = "#fab035ff"
line_color = "#D0D0D0"
bar_bg_color = "#E6E6E6"

# Circle/icon sizes — DO NOT CHANGE if you want consistency across figures
fixed_radius = 0.65
icon_vector_size = 0.62

# Fonts — DO NOT CHANGE if you want consistency across figures
SECTION_TITLE_SIZE = 22
LABEL_SIZE = 12
COUNT_SIZE = 10
VERTICAL_TITLE_SIZE = 28
QUESTION_MARK_SIZE = 24

# Bars — DO NOT CHANGE if you want consistency across figures
BAR_TOTAL = 1.20
BAR_MAX_FIGURES = 1824  # Full bar = total coded panels; keeps scale comparable
bar_width = 0.075

# Vertical spacing — DO NOT CHANGE if you want consistency across figures
LABEL_GAP = 0.13
BAR_GAP = 0.03
N_LABEL_GAP = 0.03
MAX_LABEL_LINES = 3
LABEL_LINE_H = 0.20
FIXED_LABEL_H = MAX_LABEL_LINES * LABEL_LINE_H

# Optional font settings
# mpl.rcParams["font.family"] = "Roboto"
# mpl.rcParams["pdf.fonttype"] = 42
# mpl.rcParams["ps.fonttype"] = 42


# ============================================================
# Codes to include
# ============================================================
selected_codes = [
    "Task.Biological.Cellular",
    "Task.Biological.Intercellular",
    "Task.Biological.Molecular",
    "Task.Biological.Systemic/Integrative",
    "Task.Biological.Tissue",
    "Task.General Analytical Domains.Comparative & Multi-Dataset Integration",
    "Task.General Analytical Domains.Molecular & Functional Landscapes",
    "Task.General Analytical Domains.Spatial Entity & Domain Identification",
    "Task.General Analytical Domains.Spatial Relational Networks",
    "Task.General Analytical Domains.Spatiotemporal Dynamics & Perturbations",
]


# Order inside each section
code_order = {
    "Biological": [
        "Cellular",
        "Intercellular",
        "Molecular",
        "Systemic/Integrative",
        "Tissue",
    ],
    "General Analytical Domains": [
        "Comparative & Multi-Dataset Integration",
        "Molecular & Functional Landscapes",
        "Spatial Entity & Domain Identification",
        "Spatial Relational Networks",
        "Spatiotemporal Dynamics & Perturbations",
    ],
}


# ============================================================
# Layout
# ============================================================
# Two rows, 5 circles per row.
# The circle radius, icon size, text size and bar size match the other figures.
section_layout = {
    "Biological": {
        "origin": (1.8, 5.8),
        "cols": 5,
        "width": 13.5,
    },
    "General Analytical Domains": {
        "origin": (1.8, 2.3),
        "cols": 5,
        "width": 13.5,
    },
}


# ============================================================
# Frequency scale
# ============================================================
def scale_bar_length(frequency):
    """Map frequency to filled bar length, where BAR_MAX_FIGURES = full bar."""
    return min(frequency / BAR_MAX_FIGURES, 1) * BAR_TOTAL


# ============================================================
# Flexible SVG matching
# ============================================================
def normalize_name(text):
    text = str(text).lower()
    text = text.replace(".svg", "")
    text = text.replace("task", "")
    text = text.replace("biological", "")
    text = text.replace("general analytical domains", "")
    text = text.replace("systemic/integrative", "systemic integrative")
    text = text.replace("systemic integrative", "systemic integrative")
    text = text.replace("multi-dataset", "multi dataset")
    text = text.replace("multi dataset", "multi dataset")
    text = re.sub(r"[^a-z0-9]+", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def build_svg_lookup(folder):
    if not os.path.isdir(folder):
        raise FileNotFoundError(
            f"No encontré la carpeta de SVGs: {folder}. "
            "Asegúrate de que exista en el mismo directorio desde donde corres el script."
        )

    svg_files = [
        f for f in os.listdir(folder)
        if f.lower().endswith(".svg")
    ]

    return {normalize_name(f): f for f in svg_files}


def find_svg_file(title, code, svg_lookup):
    candidates = [
        normalize_name(f"{title} {code}"),
        normalize_name(code),
    ]

    for target in candidates:
        if target in svg_lookup:
            return svg_lookup[target]

    target = candidates[0]
    matches = get_close_matches(
        target,
        svg_lookup.keys(),
        n=1,
        cutoff=0.45,
    )

    if matches:
        return svg_lookup[matches[0]]

    return None


# ============================================================
# SVG as vector patches
# ============================================================
def load_svg_paths(svg_path):
    tree = ET.parse(svg_path)
    root = tree.getroot()

    paths = []
    for elem in root.iter():
        if elem.tag.endswith("path") and elem.get("d"):
            paths.append(parse_path(elem.get("d")))

    return paths


def draw_svg_icon(ax, svg_path, x, y, size=icon_vector_size, color=icon_color):
    paths = load_svg_paths(svg_path)

    if not paths:
        return False

    all_bboxes = [p.get_extents() for p in paths]
    x0 = min(b.x0 for b in all_bboxes)
    y0 = min(b.y0 for b in all_bboxes)
    x1 = max(b.x1 for b in all_bboxes)
    y1 = max(b.y1 for b in all_bboxes)

    width = x1 - x0
    height = y1 - y0

    if width == 0 or height == 0:
        return False

    scale = size / max(width, height)

    transform = (
        Affine2D()
        .translate(-(x0 + width / 2), -(y0 + height / 2))
        .scale(scale, -scale)
        .translate(x, y)
        + ax.transData
    )

    for path in paths:
        patch = PathPatch(
            path,
            facecolor=color,
            edgecolor="none",
            transform=transform,
            zorder=2,
        )
        ax.add_patch(patch)

    return True


# ============================================================
# Labels
# ============================================================
def wrap_label(text, width=18):
    text = str(text)

    manual_breaks = {
        "Systemic/Integrative": "Systemic/\nIntegrative",
        "Comparative & Multi-Dataset Integration": "Comparative &\nMulti-Dataset Integration",
        "Molecular & Functional Landscapes": "Molecular &\nFunctional Landscapes",
        "Spatial Entity & Domain Identification": "Spatial Entity &\nDomain Identification",
        "Spatial Relational Networks": "Spatial\nRelational\nNetworks",
        "Spatiotemporal Dynamics & Perturbations": "Spatiotemporal\nDynamics & Perturbations",
    }

    if text in manual_breaks:
        return manual_breaks[text]

    return "\n".join(textwrap.wrap(text, width=width))


# ============================================================
# Data preparation
# ============================================================
def prepare_task_frequencies(df_clean):
    task = df_clean[df_clean[code_col].astype(str).isin(selected_codes)].copy()

    task["taxonomy_path"] = task[code_col].str.replace(
        f"^{re.escape(prefix)}", "", regex=True
    )

    task[["title", "code"]] = task["taxonomy_path"].str.split(".", n=1, expand=True)
    task = task.dropna(subset=["title", "code"])

    freq = (
        task.groupby(["title", "code"])
        .size()
        .reset_index(name="frequency")
    )

    # Add zero-count rows for selected codes that are not present in df_clean.
    full_rows = []
    for full_code in selected_codes:
        taxonomy_path = re.sub(f"^{re.escape(prefix)}", "", full_code)
        title, code = taxonomy_path.split(".", 1)
        full_rows.append({"title": title, "code": code})

    full = pd.DataFrame(full_rows)
    freq = full.merge(freq, on=["title", "code"], how="left")
    freq["frequency"] = freq["frequency"].fillna(0).astype(int)

    return freq


# ============================================================
# Plot
# ============================================================
def plot_task_taxonomy(df_clean, output_prefix="task_taxonomy_frequency_horizontal"):
    freq = prepare_task_frequencies(df_clean)
    svg_lookup = build_svg_lookup(svg_folder)

    fig, ax = plt.subplots(figsize=(16.5, 8.0))
    ax.set_aspect("equal")
    ax.axis("off")

    missing_svgs = []

    def draw_section(title, origin, cols, width):
        x0, y0 = origin
        subset = freq[freq["title"] == title].copy()

        if subset.empty:
            return

        order_map = {c: i for i, c in enumerate(code_order[title])}
        subset["order"] = subset["code"].map(order_map)
        subset = subset.dropna(subset=["order"]).sort_values("order")

        ax.text(
            x0,
            y0 + 1.05,
            title,
            fontsize=SECTION_TITLE_SIZE,
            color=icon_color,
            ha="left",
            va="center",
        )

        ax.plot(
            [x0, x0 + width],
            [y0 + 0.72, y0 + 0.72],
            color=line_color,
            linewidth=1.8,
        )

        x_spacing = width / cols
        circle_top_padding = 0.25
        row_gap = 2.2
        first_row_y = y0 + 0.72 - fixed_radius - circle_top_padding

        for i, row in subset.reset_index(drop=True).iterrows():
            col = i % cols
            row_i = i // cols

            cx = x0 + col * x_spacing + x_spacing / 2
            cy = first_row_y - row_i * row_gap

            code = row["code"]
            frequency = row["frequency"]

            circle = plt.Circle(
                (cx, cy),
                fixed_radius,
                color=bg_color,
                ec="none",
                zorder=1,
            )
            ax.add_patch(circle)

            svg_name = find_svg_file(title, code, svg_lookup)
            svg_path = os.path.join(svg_folder, svg_name) if svg_name else None

            if svg_path and os.path.exists(svg_path):
                ok = draw_svg_icon(
                    ax,
                    svg_path,
                    cx,
                    cy,
                    size=icon_vector_size,
                    color=icon_color,
                )
                if not ok:
                    missing_svgs.append(f"{title} / {code} -- SVG sin paths")
                    ax.text(
                        cx,
                        cy,
                        "?",
                        fontsize=QUESTION_MARK_SIZE,
                        color=icon_color,
                        ha="center",
                        va="center",
                        zorder=2,
                    )
            else:
                missing_svgs.append(f"{title} / {code}")
                ax.text(
                    cx,
                    cy,
                    "?",
                    fontsize=QUESTION_MARK_SIZE,
                    color=icon_color,
                    ha="center",
                    va="center",
                    zorder=2,
                )

            label_text = wrap_label(code, width=16)
            label_y_center = (
                cy
                - fixed_radius
                - LABEL_GAP
                - FIXED_LABEL_H / 2
            )

            ax.text(
                cx,
                label_y_center,
                label_text,
                fontsize=LABEL_SIZE,
                ha="center",
                va="center",
                color="black",
                linespacing=1.3,
            )

            bar_y_top = (
                cy
                - fixed_radius
                - LABEL_GAP
                - FIXED_LABEL_H
                - BAR_GAP
            )

            bar_x_left = cx - BAR_TOTAL / 2
            filled_length = scale_bar_length(frequency)

            bar_bg = plt.Rectangle(
                (bar_x_left, bar_y_top - bar_width),
                BAR_TOTAL,
                bar_width,
                color=bar_bg_color,
                zorder=1.5,
            )
            ax.add_patch(bar_bg)

            bar_fill = plt.Rectangle(
                (bar_x_left, bar_y_top - bar_width),
                filled_length,
                bar_width,
                color=icon_color,
                zorder=2,
            )
            ax.add_patch(bar_fill)

            ax.text(
                cx,
                bar_y_top - bar_width - N_LABEL_GAP,
                f"n = {frequency}",
                fontsize=COUNT_SIZE,
                ha="center",
                va="top",
                color=icon_color,
            )

    for section, params in section_layout.items():
        draw_section(
            title=section,
            origin=params["origin"],
            cols=params["cols"],
            width=params["width"],
        )

    # Vertical left title
    ax.text(
        0.5,
        3.9,
        "What: Task Taxonomy",
        fontsize=VERTICAL_TITLE_SIZE,
        color=icon_color,
        rotation=90,
        ha="center",
        va="center",
    )

    ax.plot(
        [1.0, 1.0],
        [0.3, 6.9],
        color=icon_color,
        linewidth=2,
    )

    ax.set_xlim(0, 16.2)
    ax.set_ylim(-0.35, 7.25)

    plt.tight_layout()

    png_path = f"{output_prefix}.png"
    pdf_path = f"{output_prefix}.pdf"
    svg_path = f"{output_prefix}.svg"

    plt.savefig(png_path, dpi=300, bbox_inches="tight")
    plt.savefig(pdf_path, bbox_inches="tight")
    plt.savefig(svg_path, bbox_inches="tight")

    plt.show()

    if missing_svgs:
        print("SVGs no encontrados o no vectorizables:")
        for s in missing_svgs:
            print(s)

    return fig, ax


# ============================================================
# Run directly in notebook using existing df_clean
# ============================================================

fig, ax = plot_task_taxonomy(
    df_clean,
    output_prefix="task_taxonomy_frequency_horizontal"
)