import numpy as np
from ml.algos.wavelet_transform.wavelet_fft import wavelet_transform

def test_wavelet_output_shape():
    signal = np.sin(np.linspace(0, 10, 1024))
    scales = range(1, 5)
    coeffs = wavelet_transform(signal, scales)
    assert coeffs.shape[0] == len(scales)
