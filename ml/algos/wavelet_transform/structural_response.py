import numpy as np

def duhamel_response(signal, impulse_response):
    return np.convolve(signal, impulse_response, mode='full')[:len(signal)]
