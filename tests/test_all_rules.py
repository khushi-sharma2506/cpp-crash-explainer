from pathlib import Path
import pytest
from cpp_crash_explainer.parser import parse_report
from cpp_crash_explainer.rules import explain_report

FIXTURES_DIR = Path(__file__).parent / "fixtures"


def test_heap_buffer_overflow():
    raw_text = (FIXTURES_DIR / "heap_buffer_overflow.txt").read_text(encoding="utf-8")
    report = parse_report(raw_text)
    exp = explain_report(report)

    assert exp.error_type == "Heap buffer overflow"
    assert "/home/student/projects/buffer_test.cpp:14" in exp.where
    assert "reading 4 byte(s)" in exp.what_the_report_tells_us
    assert "4 byte(s) past the end" in exp.what_the_report_tells_us
    assert "allocated at /home/student/projects/buffer_test.cpp:10" in exp.what_the_report_tells_us
    assert "WHAT TO CHECK NEXT" in exp.format_text()


def test_heap_use_after_free():
    raw_text = (FIXTURES_DIR / "heap_use_after_free.txt").read_text(encoding="utf-8")
    report = parse_report(raw_text)
    exp = explain_report(report)

    assert exp.error_type == "Heap use-after-free"
    assert "/home/student/projects/uaf_test.cpp:15" in exp.where
    assert "reading 4 byte(s) of already-freed memory" in exp.what_the_report_tells_us
    assert "deallocated (freed/deleted) at /home/student/projects/uaf_test.cpp:12" in exp.what_the_report_tells_us
    assert "originally allocated at /home/student/projects/uaf_test.cpp:9" in exp.what_the_report_tells_us


def test_stack_buffer_overflow():
    raw_text = (FIXTURES_DIR / "stack_buffer_overflow.txt").read_text(encoding="utf-8")
    report = parse_report(raw_text)
    exp = explain_report(report)

    assert exp.error_type == "Stack buffer overflow"
    assert "/home/student/projects/stack_test.cpp:8" in exp.where
    assert "writing 4 byte(s)" in exp.what_the_report_tells_us
    assert "overflowed the stack variable 'buffer'" in exp.what_the_report_tells_us


def test_null_pointer_dereference():
    raw_text = (FIXTURES_DIR / "null_pointer_dereference.txt").read_text(encoding="utf-8")
    report = parse_report(raw_text)
    exp = explain_report(report)

    assert exp.error_type == "Null pointer dereference"
    assert "/home/student/projects/null_deref.cpp:7" in exp.where
    assert "reading from this address" in exp.what_the_report_tells_us
    assert "0x000000000000" in exp.what_the_report_tells_us


def test_memory_leak():
    raw_text = (FIXTURES_DIR / "memory_leak.txt").read_text(encoding="utf-8")
    report = parse_report(raw_text)
    exp = explain_report(report)

    assert exp.error_type == "Memory leak"
    assert "40 byte(s) leaked across 1 allocation(s)" in exp.what_the_report_tells_us
    assert "/home/student/projects/leak_test.cpp:6" in exp.what_the_report_tells_us


def test_global_buffer_overflow():
    raw_text = (FIXTURES_DIR / "global_buffer_overflow.txt").read_text(encoding="utf-8")
    report = parse_report(raw_text)
    exp = explain_report(report)

    assert exp.error_type == "Global buffer overflow"
    assert "/home/student/projects/global_test.cpp:8" in exp.where
    assert "global variable 'global_array'" in exp.what_the_report_tells_us
    assert "40 bytes" in exp.what_the_report_tells_us


def test_stack_use_after_scope():
    raw_text = (FIXTURES_DIR / "stack_use_after_scope.txt").read_text(encoding="utf-8")
    report = parse_report(raw_text)
    exp = explain_report(report)

    assert exp.error_type == "Stack use-after-scope"
    assert "/home/student/projects/scope_test.cpp:11" in exp.where
    assert "local variable 'x'" in exp.what_the_report_tells_us


def test_unsupported_or_empty_report():
    report = parse_report("Unknown crash data")
    exp = explain_report(report)
    assert "Unsupported or Unrecognized Report" in exp.error_type
