## 1) Start Infra (Docker only)

```bash
cd /home/ayush/Projects/portfolio/gallifrey/infra
docker compose up -d
docker compose ps
```

Starts:
- TimescaleDB (`5432`)
- Prometheus (`9090`)
- Grafana (`3000`)
- Chroma (`8001`)

## 2) Run ML API locally (no Docker)

```bash
cd /home/ayush/Projects/portfolio/gallifrey/ml
uv sync
uv run uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```



## 3) Run ML mock stream locally (optional but recommended)

Open a new terminal:

```bash
cd /home/ayush/Projects/portfolio/gallifrey/ml
uv run python -m mock.stream_client
```

## 4) Run Agentic API locally

Open a new terminal:

```bash
cd /home/ayush/Projects/portfolio/gallifrey/agentic
uv sync
uv run uvicorn scripts.main:app --host 0.0.0.0 --port 8002 --reload
```


## 5) Configure and run Frontend in dev mode

Create/update env file:

```bash
cat >/home/ayush/Projects/portfolio/gallifrey/frontend/.env.local <<'EOF'
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_AGENTIC_URL=http://localhost:8002
NEXT_PUBLIC_GRAFANA_URL=http://localhost:3000
EOF
```

Start frontend:

```bash
cd /home/ayush/Projects/portfolio/gallifrey/frontend
npm install
npm run dev -- -p 3001
```

## 6) Open URLs

- Frontend: http://localhost:3001
- ML API docs: http://localhost:8000/docs
- Agentic API: http://localhost:8002
- Grafana: http://localhost:3000
- Prometheus: http://localhost:9090

## 7) Verify DB-backed Structures API

Create structure:

```bash
curl -X POST http://localhost:8000/structures \
	-H "Content-Type: application/json" \
	-d '{"name":"North Pillar","type":"bridge","location":"Sector-9"}'
```

List structures:

```bash
curl http://localhost:8000/structures
```

Connect a sensor (replace structure id):

```bash
curl -X POST http://localhost:8000/structures/1/sensors \
	-H "Content-Type: application/json" \
	-d '{"name":"S-01","type":"strain_gauge","x":1.2,"y":2.0,"z":0.1,"stream_url":"mock://sensor-feed","connected":true}'
```

List structure sensors:

```bash
curl http://localhost:8000/structures/1/sensors
```

## 8) Verify AI PDF report generation

```bash
curl -X POST http://localhost:8002/reports/structure \
	-H "Content-Type: application/json" \
	-d '{
		"structure_id": 1,
		"structure_name": "North Pillar",
		"structure_type": "bridge",
		"location": "Sector-9",
		"sensors": [{"name":"S-01","type":"strain_gauge","x":1.2,"y":2.0,"z":0.1,"connected":true}],
		"telemetry_summary": {"latest_health": 91.4, "current_vibration_g": 0.29, "websocket_connected": true}
	}' --output north_pillar_report.pdf
```

This should produce a downloadable PDF report file.
