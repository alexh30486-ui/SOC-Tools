# SPDX-License-Identifier: Apache-2.0
"""Run full published-layout CPU tokenizer/renderer checks, including B2."""
from lora_validate import main
if __name__ == '__main__':
    main(include_b2=True)
