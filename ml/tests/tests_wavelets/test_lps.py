import numpy as np
from ml.algos.wavelet_transform.local_power_spectra import compute_lps

def test_lps_positive():
    wavelet_coeffs = np.random.randn(5, 1000)
    lps = compute_lps(wavelet_coeffs)
    assert np.all(lps >= 0)
