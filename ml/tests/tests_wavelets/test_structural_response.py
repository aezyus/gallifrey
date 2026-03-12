import numpy as np
from ml.algos.wavelet_transform.structural_response import duhamel_response

def test_response_length():
    signal = np.random.randn(1000)
    impulse = np.exp(-0.1 * np.arange(100))
    response = duhamel_response(signal, impulse)
    assert len(response) == len(signal)
