import requests
import json

payload = {
    "structure_id": 101,
    "structure_name": "Bridge A",
    "structure_type": "suspension",
    "location": "North Sector",
    "sensors": [
        {"name": "S-01", "type": "strain_gauge", "x": 1.2, "y": 2.0, "z": 0.1, "connected": True}
    ],
    "telemetry_summary": {
        "latest_health": 94.2,
        "current_vibration_g": 0.24,
        "websocket_connected": True
    }
}

response = requests.post("http://localhost:8002/reports/structure", json=payload)

if response.status_code == 200:
    with open("Bridge_A_AI_Report.pdf", "wb") as f:
        f.write(response.content)
    print("Sucessfully generated Bridge_A_AI_Report.pdf")
else:
    print(f"Failed to generate report: {response.status_code}")
    print(response.text)
