import numpy as np

def compute_lps(wavelet_coeffs):
    return np.mean(np.square(wavelet_coeffs), axis=0)
