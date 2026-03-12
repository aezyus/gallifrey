import json
import os

os.makedirs('data', exist_ok=True)

notebook_content = {
    "cells": [
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "# Infrastructure Failure Risk Prediction\n",
                "\n",
                "This notebook loads the machine learning anomaly detection models trained in `Analysis.ipynb` and applies them to compute an aggregated **Structural Failure Risk Score**."
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "import pandas as pd\n",
                "import numpy as np\n",
                "import joblib\n",
                "import torch\n",
                "import torch.nn as nn\n",
                "import torch.nn.functional as F\n",
                "import matplotlib.pyplot as plt\n",
                "import seaborn as sns\n",
                "\n",
                "# Visualization setup\n",
                "import matplotlib as mpl\n",
                "mpl.style.use('dark_background')\n",
                "sns.set_palette(['#00D4FF', '#FF6B35', '#7FFF00', '#FFD700', '#FF69B4', '#9B59B6'])"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "## 1. Define VAE Class & Load Models"
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "# We recreate the VAE class architecture to load the state dict\n",
                "class VAE(nn.Module):\n",
                "    def __init__(self, input_dim, hidden_dim=8, latent_dim=2):\n",
                "        super(VAE, self).__init__()\n",
                "        self.fc1 = nn.Linear(input_dim, hidden_dim)\n",
                "        self.fc21 = nn.Linear(hidden_dim, latent_dim)\n",
                "        self.fc22 = nn.Linear(hidden_dim, latent_dim)\n",
                "        self.fc3 = nn.Linear(latent_dim, hidden_dim)\n",
                "        self.fc4 = nn.Linear(hidden_dim, input_dim)\n",
                "\n",
                "    def encode(self, x):\n",
                "        h1 = F.relu(self.fc1(x))\n",
                "        return self.fc21(h1), self.fc22(h1)\n",
                "\n",
                "    def reparameterize(self, mu, logvar):\n",
                "        std = torch.exp(0.5*logvar)\n",
                "        eps = torch.randn_like(std)\n",
                "        return mu + eps*std\n",
                "\n",
                "    def decode(self, z):\n",
                "        h3 = F.relu(self.fc3(z))\n",
                "        return self.fc4(h3)\n",
                "\n",
                "    def forward(self, x):\n",
                "        mu, logvar = self.encode(x)\n",
                "        z = self.reparameterize(mu, logvar)\n",
                "        return self.decode(z), mu, logvar\n",
                "\n",
                "print(\"Loading models...\")\n",
                "# Load Standard Scaler\n",
                "scaler = joblib.load('models/scaler.pkl')\n",
                "# Load Isolation Forest\n",
                "iso_forest = joblib.load('models/isolation_forest.pkl')\n",
                "# Load PyTorch VAE\n",
                "device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')\n",
                "input_dim = scaler.n_features_in_  # Dynamically pull the expected input shape\n",
                "vae = VAE(input_dim).to(device)\n",
                "vae.load_state_dict(torch.load('models/vae_state_dict.pth', map_location=device))\n",
                "vae.eval() # Set to evaluation mode\n",
                "print(\"Models loaded successfully!\")"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "## 2. Load Streaming Data Chunk"
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "# Let's simulate a streaming context by pulling the next 2000 rows \n",
                "# from digitaltwin.csv (e.g. rows 5000 to 7000) that the model hasn't specifically \"seen\" recently in demo.\n",
                "DT_PATH = 'digitaltwin.csv'\n",
                "dt_chunk = pd.read_csv(DT_PATH, skiprows=range(1, 5001), nrows=2000)\n",
                "# Assuming columns are maintained. If the header is weird after skiprow, let's just load normally and slice.\n",
                "dt_chunk = pd.read_csv(DT_PATH, parse_dates=['Timestamp']).iloc[5000:7000].reset_index(drop=True)\n",
                "\n",
                "# ML Input features must match training exactly:\n",
                "ml_features = ['Strain_microstrain', 'Deflection_mm', 'Vibration_ms2']\n",
                "X_new = dt_chunk[ml_features].values\n",
                "X_new_scaled = scaler.transform(X_new)\n",
                "print(f\"Loaded streaming data chunk shape: {X_new_scaled.shape}\")"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "## 3. Compute Anomaly Component Scores"
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "# 3.1 Isolation Forest Base Anomaly\n",
                "# Preds are 1 (normal) or -1 (anomaly). Let's convert to an anomaly penalty: 1 for anomaly, 0 for normal.\n",
                "iso_preds = iso_forest.predict(X_new_scaled)\n",
                "iso_penalty = np.where(iso_preds == -1, 1, 0)\n",
                "\n",
                "# 3.2 VAE Reconstruction Error\n",
                "X_tensor = torch.tensor(X_new_scaled, dtype=torch.float32).to(device)\n",
                "with torch.no_grad():\n",
                "    recon_x, _, _ = vae(X_tensor)\n",
                "    mse_loss = nn.MSELoss(reduction='none')\n",
                "    # sum over the feature dimensions to get per-row error\n",
                "    recon_errors = mse_loss(recon_x, X_tensor).sum(dim=1).cpu().numpy()\n",
                "\n",
                "# Convert unbounded RE to a bounded (0-1) score using Min-Max or standard cutoff.\n",
                "# We'll assume any RE > 5 is critically anomalous (scaling based on our training loss).\n",
                "vae_score = np.clip(recon_errors / 5.0, 0, 1)\n",
                "print(\"Computed Anomaly scores.\")"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "## 4. Compute Final Risk Index\n",
                "The **Risk Index (0-100)** combines the ML model structural health markers with external loading conditions (Wind and Traffic)."
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "# Normalize environmental/traffic factors for Risk Equation\n",
                "wind_normalized = np.clip(dt_chunk['Wind_Speed_ms'].values / 40.0, 0, 1) # max wind 40m/s\n",
                "traffic_normalized = np.clip(dt_chunk['Traffic_Volume_vph'].values / 6000.0, 0, 1) # max traffic 6k vph\n",
                "\n",
                "# The Risk Index Equation Formula\n",
                "# 40% VAE Reconstruction Error (subtle systemic anomalies)\n",
                "# 30% Isolation Forest Trigger (sudden multivariate outliers)\n",
                "# 15% Wind Load\n",
                "# 15% Traffic Load\n",
                "\n",
                "risk_scores = (\n",
                "    (vae_score * 40.0) + \n",
                "    (iso_penalty * 30.0) + \n",
                "    (wind_normalized * 15.0) +\n",
                "    (traffic_normalized * 15.0)\n",
                ")\n",
                "dt_chunk['Computed_Risk_Score'] = risk_scores\n",
                "\n",
                "def assign_risk_level(score):\n",
                "    if score < 25:\n",
                "        return 'Low'\n",
                "    elif score < 50:\n",
                "        return 'Medium'\n",
                "    elif score < 75:\n",
                "        return 'High'\n",
                "    else:\n",
                "        return 'Critical'\n",
                "        \n",
                "dt_chunk['Risk_Level'] = dt_chunk['Computed_Risk_Score'].apply(assign_risk_level)\n",
                "print(dt_chunk['Risk_Level'].value_counts())"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "## 5. Visualizing Risk Over Time"
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "plt.figure(figsize=(14, 6))\n",
                "sns.lineplot(x='Timestamp', y='Computed_Risk_Score', data=dt_chunk, color='#FF6B35')\n",
                "plt.axhline(75, color='red', linestyle='--', label='Critical Threshold')\n",
                "plt.axhline(50, color='orange', linestyle='--', label='High Threshold')\n",
                "plt.axhline(25, color='yellow', linestyle='--', label='Medium Threshold')\n",
                "plt.title('Infrastructure Risk Score Monitoring Feed')\n",
                "plt.ylabel('Risk Score (0-100)')\n",
                "plt.xlabel('Time')\n",
                "plt.legend()\n",
                "plt.show()\n",
                "\n",
                "# Let's also look at the breakdown of VAE scores for the critical instances\n",
                "critical = dt_chunk[dt_chunk['Risk_Level'] == 'Critical']\n",
                "if not critical.empty:\n",
                "    print(f\"Found {len(critical)} critically flagged instances. Engineers notified.\")\n",
                "else:\n",
                "    print(\"No critical risk instances found in this time window.\")"
            ]
        }
    ],
    "metadata": {
        "kernelspec": {
            "display_name": "Python 3",
            "language": "python",
            "name": "python3"
        },
        "language_info": {
            "codemirror_mode": {
                "name": "ipython",
                "version": 3
            },
            "file_extension": ".py",
            "mimetype": "text/x-python",
            "name": "python",
            "nbconvert_exporter": "python",
            "pygments_lexer": "ipython3",
            "version": "3.12.0"
        }
    },
    "nbformat": 4,
    "nbformat_minor": 5
}

with open('data/Risk_Prediction.ipynb', 'w', encoding='utf-8') as f:
    json.dump(notebook_content, f, indent=1)

print("Created data/Risk_Prediction.ipynb")
