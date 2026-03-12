from prometheus_client import Counter, Histogram

REQUEST_COUNT = Counter(
    "agentic_requests_total", "Request count for Agentic AI API", ["endpoint"]
)

REQUEST_LATENCY = Histogram(
    "agentic_request_latency_seconds",
    "Request latency in seconds for Agentic AI API",
    ["endpoint"],
)
