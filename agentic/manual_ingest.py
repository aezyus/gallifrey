from scripts.pdf_ingest import ingest_pdf
import os

if __name__ == "__main__":
    pdf_path = "Bridge-A_Inspection_Report.pdf"
    if os.path.exists(pdf_path):
        print(f"Starting ingestion of {pdf_path}...")
        result = ingest_pdf(pdf_path)
        print(result)
    else:
        print(f"Error: {pdf_path} not found.")
