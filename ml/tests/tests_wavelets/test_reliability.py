import numpy as np
from ml.algos.wavelet_transform.reliability_analysis import upcrossing_rate

def test_upcrossing_rate():
    a0 = 1.0
    a2 = 4.0
    rate = upcrossing_rate(a0, a2)
    assert rate > 0
