import numpy as np

def upcrossing_rate(a0, a2):
    return (1/(2*np.pi)) * np.sqrt(a2/a0)

def reliability_probability(vb, t):
    return np.exp(-vb * t)
