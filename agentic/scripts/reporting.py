from datetime import datetime
import importlib
from pathlib import Path
from typing import Any, Dict, List


REPORTS_DIR = Path(__file__).resolve().parents[1] / "reports"


def _draw_line(pdf: Any, label: str, value: str, y: int) -> int:
    pdf.setFont("Helvetica-Bold", 10)
    pdf.drawString(50, y, f"{label}:")
    pdf.setFont("Helvetica", 10)
    pdf.drawString(180, y, value)
    return y - 16


def generate_structure_report_pdf(payload: Dict[str, Any]) -> str:
    pagesizes_module = importlib.import_module("reportlab.lib.pagesizes")
    canvas_module = importlib.import_module("reportlab.pdfgen.canvas")
    A4 = pagesizes_module.A4
    Canvas = canvas_module.Canvas

    REPORTS_DIR.mkdir(parents=True, exist_ok=True)

    structure_id = payload.get("structure_id", "unknown")
    filename = f"structure_{structure_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.pdf"
    file_path = REPORTS_DIR / filename

    sensors: List[Dict[str, Any]] = payload.get("sensors", [])
    summary: Dict[str, Any] = payload.get("telemetry_summary", {})

    pdf = Canvas(str(file_path), pagesize=A4)
    width, height = A4

    y = height - 50
    pdf.setFont("Helvetica-Bold", 18)
    pdf.drawString(50, y, "Gallifrey AI Structural Report")

    y -= 24
    pdf.setFont("Helvetica", 9)
    pdf.drawString(50, y, f"Generated UTC: {datetime.utcnow().isoformat()}Z")

    y -= 30
    y = _draw_line(pdf, "Structure ID", str(payload.get("structure_id", "-")), y)
    y = _draw_line(pdf, "Structure Name", str(payload.get("structure_name", "-")), y)
    y = _draw_line(pdf, "Structure Type", str(payload.get("structure_type", "-")), y)
    y = _draw_line(pdf, "Location", str(payload.get("location", "-")), y)
    y = _draw_line(pdf, "Connected Sensors", str(len(sensors)), y)

    y -= 10
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(50, y, "Telemetry Summary")
    y -= 20

    if summary:
        for key, value in summary.items():
            y = _draw_line(pdf, str(key).replace("_", " ").title(), str(value), y)
            if y < 80:
                pdf.showPage()
                y = height - 50
    else:
        pdf.setFont("Helvetica", 10)
        pdf.drawString(50, y, "No telemetry summary provided.")
        y -= 16

    y -= 6
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(50, y, "Sensor Registry")
    y -= 18
    pdf.setFont("Helvetica", 10)

    if sensors:
        for sensor in sensors:
            row = (
                f"- {sensor.get('name', 'sensor')} ({sensor.get('type', '-')}) "
                f"@ ({sensor.get('x', 0)}, {sensor.get('y', 0)}, {sensor.get('z', 0)}) "
                f"status={sensor.get('connected', True)}"
            )
            pdf.drawString(50, y, row[:115])
            y -= 14
            if y < 70:
                pdf.showPage()
                y = height - 50
                pdf.setFont("Helvetica", 10)
    else:
        pdf.drawString(50, y, "No sensors connected.")

    pdf.showPage()
    pdf.save()

    return str(file_path)
