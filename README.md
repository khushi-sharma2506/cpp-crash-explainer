# C++ Crash Explainer

[![PyPI version](https://img.shields.io/pypi/v/cpp-crash-explainer.svg?color=blue)](https://pypi.org/project/cpp-crash-explainer/)
[![CI Tests](https://github.com/khushi-sharma2506/cpp-crash-explainer/actions/workflows/ci.yml/badge.svg)](https://github.com/khushi-sharma2506/cpp-crash-explainer/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python Versions](https://img.shields.io/pypi/pyversions/cpp-crash-explainer.svg)](https://pypi.org/project/cpp-crash-explainer/)

A beginner-friendly developer tool that translates cryptic C++ **AddressSanitizer (ASan)** and **LeakSanitizer (LSan)** diagnostic reports into plain, actionable English.

---

## 🎯 Supported Diagnostic Categories

| Error Type | What Gets Extracted | Common Root Cause |
| :--- | :--- | :--- |
| **Heap buffer overflow** | Access type (`READ`/`WRITE`), byte count, offset past buffer, allocation site. | Off-by-one array loop, improper `new[]` size. |
| **Heap use-after-free** | Byte size, deallocation line, original allocation site, crash line. | Dangling pointer, premature `delete`. |
| **Stack buffer overflow** | Overflowed local stack variable name, byte count, crash line. | Writing past fixed-size local array (`buf[N]`). |
| **Stack use-after-scope** | Variable name that went out of scope, frame location. | Storing/returning pointer to inner block variable. |
| **Global buffer overflow** | Global variable name, definition file & line, overflow offset. | Writing past bounds of global/static array. |
| **Null pointer deref** | Null target address (`0x0` / zero page), memory access type. | Dereferencing unchecked `nullptr` return. |
| **Memory leaks** | Leaked byte count, allocation count, allocation call site. | Missing `delete` / `free` before program exit. |

Compiling C++ programs with `-fsanitize=address` is the gold standard for catching memory safety errors (like buffer overflows and use-after-free bugs). However, the default diagnostic output is verbose, technical, and often overwhelms students and beginners.

**C++ Crash Explainer** parses the raw ASan crash report and provides:
1. **Error Type:** What kind of bug happened in clear terms.
2. **Where:** The exact source file, line number, and function where the crash occurred.
3. **What The Report Tells Us:** Facts extracted from the report (how many bytes were read/written, buffer size, allocation site).
4. **What To Check Next:** Actionable hints on common root causes (off-by-one errors, loop boundaries, pointer math).
5. **Limitations:** Clear statements on what the report *cannot* know so beginners don't make assumptions.

---

## 🚀 Quick Start

### Installation

```bash
pip install cpp-crash-explainer
```

### Usage

Pass a saved AddressSanitizer report file directly:

```bash
cpp-crash-explainer report.txt
```

Or pipe a crash output directly via standard input:

```bash
./my_program 2>&1 | cpp-crash-explainer
```

---

## 💡 Example

Given an AddressSanitizer heap-buffer-overflow report, the tool outputs:

```text
C++ CRASH EXPLAINER

ERROR TYPE
Heap buffer overflow

WHAT HAPPENED
The program attempted to read or write memory outside the valid boundaries of a dynamically allocated (heap) array or object.

WHERE
/home/student/projects/buffer_test.cpp:14 (in function 'main')

WHAT THE REPORT TELLS US
The program crashed while reading 4 byte(s). The memory access occurred 4 byte(s) past the end of a 40-byte allocated heap buffer. The heap buffer was allocated at /home/student/projects/buffer_test.cpp:10.

WHAT TO CHECK NEXT
1. Check the array/buffer indexing at the crash location to see if the index exceeds the size.
2. Remember that in C++, an array of size N has valid indices from 0 to N-1 (off-by-one errors are common).
3. Check loop bounds (e.g., using '<=' instead of '<').
4. If using raw pointers or manual allocation (new[] / malloc), verify that the allocated byte size matches the data type.

LIMITATIONS
AddressSanitizer detects that an out-of-bounds address was accessed, but it cannot know what value you intended to calculate or why the index became invalid. You must inspect the logic leading up to the access.
```

---

## 🧪 Running Tests

```bash
pytest
```
