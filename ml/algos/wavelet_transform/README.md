# Wavelet Analysis Module

## Algorithms (`ml/algos/wavelet_transform`)
- **wavelet_fft.py**: CWT using PyWavelets.
- **local_power_spectra.py**: LPS estimation.
- **structural_response.py**: Duhamel integral via NumPy.
- **reliability_analysis.py**: First passage reliability.
- **utils.py**: Evolutionary PSD computation.

## Tests (`ml/tests/tests_wavelets`)
- **test_wavelet_transform.py**: Shape validation.
- **test_lps.py**: Energy positivity check.
- **test_structural_response.py**: Response length verification.
- **test_reliability.py**: Crossing rate validation.
- **test_pipeline.py**: End-to-end workflow test.

## Execution
```bash
# Run tests
uv run pytest ml/tests/tests_wavelets
```
