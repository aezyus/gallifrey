from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
import os

def create_report(filename):
    c = canvas.Canvas(filename, pagesize=letter)
    width, height = letter
    
    c.setFont("Helvetica-Bold", 16)
    c.drawString(100, height - 100, "Infrastructure Inspection Report: Bridge-A")
    
    c.setFont("Helvetica", 12)
    c.drawString(100, height - 130, "Report ID: GA-2026-001")
    c.drawString(100, height - 150, "Date: January 15, 2026")
    c.drawString(100, height - 170, "Asset: North Span Overpass (Bridge-A)")
    
    c.setFont("Helvetica-Bold", 14)
    c.drawString(100, height - 210, "1. Executive Summary")
    c.setFont("Helvetica", 12)
    c.drawString(100, height - 230, "The structural audit of Bridge-A indicates stable condition with one localized area of concern.")
    c.drawString(100, height - 250, "Overall Structural Health Index (SHI) is currently estimated at 94.2.")
    
    c.setFont("Helvetica-Bold", 14)
    c.drawString(100, height - 290, "2. Key Findings")
    c.setFont("Helvetica", 12)
    c.drawString(100, height - 310, "- Segment 3 (Left Support): Observed minor stress concentration in the main span.")
    c.drawString(100, height - 330, "- Vibration levels (RMS) at 20-30Hz are slightly above baseline but within safety limits.")
    c.drawString(100, height - 350, "- Expansion joints show no signs of corrosion.")
    
    c.setFont("Helvetica-Bold", 14)
    c.drawString(100, height - 390, "3. Recommendations")
    c.setFont("Helvetica", 12)
    c.drawString(100, height - 410, "- Increase polling rate for strain gauges in Segment 3.")
    c.drawString(100, height - 430, "- Schedule detailed thermal bridge audit for Summer 2026.")
    c.drawString(100, height - 450, "- Prioritize monthly vibration analysis reports.")
    
    c.setFont("Helvetica-Bold", 14)
    c.drawString(100, height - 490, "4. Asset History")
    c.setFont("Helvetica", 12)
    c.drawString(100, height - 510, "Bridge-A was repaired in 2021 specifically for joint movement issues.")
    c.drawString(100, height - 530, "Historically, Segment 3 has been the most active flex zone.")
    
    c.save()
    print(f"File {filename} created at {os.path.abspath(filename)}")

if __name__ == "__main__":
    create_report("Bridge-A_Inspection_Report.pdf")
