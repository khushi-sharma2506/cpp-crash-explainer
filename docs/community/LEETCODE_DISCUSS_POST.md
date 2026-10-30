# Tired of cryptic AddressSanitizer crashes on LeetCode? Here is a free open-source tool that explains them in plain English

Hi everyone,

If you solve LeetCode problems in C++, you’ve definitely run into this red wall of text:

```text
=================================================================
==22==ERROR: AddressSanitizer: heap-buffer-overflow on address 0x502000000078
READ of size 4 at 0x502000000078 thread T0
    #0 0x401233 in Solution::twoSum ...
=================================================================
```

For students and beginners, raw sanitizer logs with 50 lines of hex addresses and register dumps can be intimidating and confusing.

To solve this, I built **`cpp-crash-explainer`** — a lightweight, open-source tool published on PyPI that takes raw AddressSanitizer / LeakSanitizer diagnostic reports and translates them into plain, actionable English.

---

### What it produces:

```text
C++ CRASH EXPLAINER

ERROR TYPE
Heap buffer overflow

WHAT HAPPENED
The program attempted to read or write memory outside the valid boundaries of a dynamically allocated (heap) array or object.

WHERE
Solution.cpp:14 (in function 'twoSum')

WHAT THE REPORT TELLS US
The program crashed while reading 4 byte(s). The memory access occurred past the end of the allocated buffer.

WHAT TO CHECK NEXT
1. Check the array/buffer indexing at the crash location to see if the index exceeds the size.
2. Remember that in C++, an array of size N has valid indices from 0 to N-1 (off-by-one errors are common).
3. Check loop bounds (e.g., using '<=' instead of '<').
4. If accessing dp[i] or arr[n], verify that the vector was allocated with size (n + 1).

LIMITATIONS
AddressSanitizer detects that an out-of-bounds address was accessed, but it cannot know what value you intended to calculate.
```

---

### How to use it:

1. Install it via pip:
```bash
pip install cpp-crash-explainer
```

2. Save your LeetCode error output to a file and run:
```bash
cpp-crash-explainer leetcode_error.txt
```

---

### Links:
- **PyPI:** https://pypi.org/project/cpp-crash-explainer/
- **GitHub:** https://github.com/khushi-sharma2506/cpp-crash-explainer

It's completely free and open-source (MIT License). I'd love to hear your feedback or suggestions for additional sanitizer rules!
