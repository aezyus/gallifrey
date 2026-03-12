import numpy as np
import pywt

def wavelet_transform(signal, scales, wavelet='morl'):
    coeffs, freqs = pywt.cwt(signal, scales, wavelet)
    return np.abs(coeffs)
