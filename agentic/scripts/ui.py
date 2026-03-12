import streamlit as st
import requests

CHAT_API = "http://127.0.0.1:8000/chat"
UPLOAD_API = "http://127.0.0.1:8000/upload_pdf"

st.set_page_config(page_title="Agentic AI Chat", layout="wide")

st.title("🤖 Agentic AI System")
st.caption("Infrastructure Monitoring Assistant")

# -------------------------------
# Helper: Extract text from API response
# -------------------------------
def extract_text(data):

    # Case 1: {"response": [...]}
    if isinstance(data, dict) and "response" in data:
        resp = data["response"]

        if isinstance(resp, list) and len(resp) > 0:
            if isinstance(resp[0], dict) and "text" in resp[0]:
                return resp[0]["text"]

        if isinstance(resp, str):
            return resp

    # Case 2: Direct list response
    if isinstance(data, list):
        if len(data) > 0 and isinstance(data[0], dict) and "text" in data[0]:
            return data[0]["text"]

    return str(data)


# -------------------------------
# PDF Upload Section
# -------------------------------
st.sidebar.header("Upload Knowledge PDF")

uploaded_file = st.sidebar.file_uploader("Upload PDF", type=["pdf"])

if uploaded_file is not None:

    files = {"file": (uploaded_file.name, uploaded_file, "application/pdf")}

    try:
        res = requests.post(UPLOAD_API, files=files)

        if res.status_code == 200:
            st.sidebar.success("✅ PDF uploaded and indexed in ChromaDB")
        else:
            st.sidebar.error("Upload failed")

    except Exception as e:
        st.sidebar.error(f"Server error: {e}")


# -------------------------------
# Chat Memory
# -------------------------------
if "messages" not in st.session_state:
    st.session_state.messages = []


# -------------------------------
# Display chat history
# -------------------------------
for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        st.markdown(msg["content"])


# -------------------------------
# Chat Input
# -------------------------------
prompt = st.chat_input("Ask about bridge sensor data or uploaded PDFs...")

if prompt:

    st.session_state.messages.append({"role": "user", "content": prompt})

    with st.chat_message("user"):
        st.markdown(prompt)

    payload = {
        "message": prompt,
        "thread_id": "streamlit_user"
    }

    try:

        response = requests.post(CHAT_API, json=payload)
        data = response.json()

        # Extract only the text
        reply = extract_text(data)

    except Exception as e:

        reply = f"❌ Error contacting API: {e}"


    with st.chat_message("assistant"):
        st.markdown(reply)

    st.session_state.messages.append(
        {"role": "assistant", "content": reply}
    )