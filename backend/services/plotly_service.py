"""Plotly chart generation — returns serialised JSON for the Next.js frontend."""

import json
import plotly.express as px
import plotly.io as pio
import pandas as pd

SECTOR_LABELS = {
    "flood": "Banjir & PPSU",
    "infrastructure": "Infrastruktur & Jalan",
    "health": "Kesehatan & Posyandu",
}

SECTOR_COLORS = {
    "Banjir & PPSU": "#1E3A8A",
    "Infrastruktur & Jalan": "#D97706",
    "Kesehatan & Posyandu": "#059669",
}


def budget_bar_chart_json(village_name: str, rows: list[dict]) -> str:
    """
    Build a bar chart of budget allocations grouped by sector.

    Args:
        village_name: display name (Kelurahan)
        rows: list of dicts with keys ``sector``, ``allocation_amount``

    Returns:
        Plotly figure serialised as a JSON string.
    """
    if not rows:
        return "{}"

    df = pd.DataFrame(rows)
    grouped = df.groupby("sector", as_index=False)["allocation_amount"].sum()
    grouped["label"] = grouped["sector"].map(SECTOR_LABELS).fillna(grouped["sector"])

    fig = px.bar(
        grouped,
        x="label",
        y="allocation_amount",
        color="label",
        color_discrete_map=SECTOR_COLORS,
        title=f"Rincian Anggaran — Kelurahan {village_name}",
        labels={"allocation_amount": "Total (Rp)", "label": ""},
        template="plotly_white",
    )

    fig.update_layout(
        font_family="Inter, sans-serif",
        title_font_size=16,
        showlegend=False,
        margin=dict(l=40, r=40, t=60, b=40),
        hovermode="x unified",
    )
    fig.update_traces(
        texttemplate="Rp %{y:,.0f}",
        textposition="outside",
        cliponaxis=False,
    )

    return pio.to_json(fig)


def budget_yearly_comparison_json(village_name: str, rows: list[dict]) -> str:
    """
    Grouped bar chart comparing sector allocations across fiscal years (2023-2025).
    """
    if not rows:
        return "{}"

    df = pd.DataFrame(rows)
    df["label"] = df["sector"].map(SECTOR_LABELS).fillna(df["sector"])
    grouped = df.groupby(["fiscal_year", "label"], as_index=False)["allocation_amount"].sum()

    fig = px.bar(
        grouped,
        x="label",
        y="allocation_amount",
        color="fiscal_year",
        barmode="group",
        title=f"Perbandingan Anggaran Tahunan — Kelurahan {village_name}",
        labels={"allocation_amount": "Total (Rp)", "label": "", "fiscal_year": "Tahun"},
        template="plotly_white",
        color_discrete_sequence=["#94A3B8", "#3B82F6", "#1E3A8A"],
    )

    fig.update_layout(
        font_family="Inter, sans-serif",
        title_font_size=16,
        margin=dict(l=40, r=40, t=60, b=40),
        hovermode="x unified",
        legend_title_text="Tahun Anggaran",
    )

    return pio.to_json(fig)
