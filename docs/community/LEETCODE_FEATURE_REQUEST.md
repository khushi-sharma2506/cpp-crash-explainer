# Feature Request: Add Human-Readable Explanations for AddressSanitizer Errors

## Summary
When C++ submissions encounter memory errors, LeetCode displays raw AddressSanitizer (ASan) output. While technically comprehensive, these diagnostic reports are dense and difficult for students and junior developers to interpret. We propose displaying a structured, beginner-friendly diagnostic card alongside the raw logs.

---

## The Problem
AddressSanitizer outputs low-level memory diagnostics:
- Register states (`pc`, `bp`, `sp`)
- Raw hexadecimal memory ranges
- Shadow byte memory dumps

Beginners frequently struggle to answer basic questions from this output:
1. Did the error occur because of an off-by-one loop or an uninitialized pointer?
2. Which variable or buffer boundary was violated?
3. What is the recommended fix in C++?

---

## Proposed Solution
Display a collapsible "Plain English Explanation" card above the raw ASan terminal output:

```text
ERROR TYPE: Heap buffer overflow
WHAT HAPPENED: Access outside the bounds of an allocated vector or heap array.
LOCATION: Solution.cpp:14 in twoSum()
WHAT TO CHECK:
- Loop bounds (e.g. '<=' vs '<' on nums.size())
- Out-of-bounds indexing on DP table / array
```

---

## Reference Implementation
An open-source reference parser and explanation engine has been implemented and released under the MIT License:
- **Project:** `cpp-crash-explainer`
- **Repository:** https://github.com/khushi-sharma2506/cpp-crash-explainer
- **PyPI Package:** https://pypi.org/project/cpp-crash-explainer/

This package is lightweight, relies solely on the Python standard library, and has zero external runtime dependencies.
