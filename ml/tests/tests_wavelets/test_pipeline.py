import numpy as np
from ml.algos.wavelet_transform.wavelet_fft import wavelet_transform
from ml.algos.wavelet_transform.local_power_spectra import compute_lps

def test_full_wavelet_pipeline():
    signal = np.sin(np.linspace(0, 20, 2048)) + 0.3 * np.random.randn(2048)
    scales = range(1, 6)
    coeffs = wavelet_transform(signal, scales)
    lps = compute_lps(coeffs)
    assert lps is not None
