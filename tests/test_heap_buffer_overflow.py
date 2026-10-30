from pathlib import Path
from cpp_crash_explainer.parser import parse_report
from cpp_crash_explainer.rules import explain_report


def test_parse_heap_buffer_overflow_fixture():
    fixture_path = Path(__file__).parent / "fixtures" / "heap_buffer_overflow.txt"
    raw_text = fixture_path.read_text(encoding="utf-8")

    report = parse_report(raw_text)

    # 1. Error type
    assert report.error_type == "heap-buffer-overflow"

    # 2. Access details
    assert report.access_type == "READ"
    assert report.access_size == 4

    # 3. Crash location
    assert report.crash_file == "/home/student/projects/buffer_test.cpp"
    assert report.crash_line == 14
    assert report.crash_function == "main"

    # 4. Allocation details
    assert report.allocation_file == "/home/student/projects/buffer_test.cpp"
    assert report.allocation_line == 10
    assert report.allocation_size == 40
    assert report.overflow_offset_bytes == 4
    assert report.overflow_direction == "right"


def test_explain_heap_buffer_overflow():
    fixture_path = Path(__file__).parent / "fixtures" / "heap_buffer_overflow.txt"
    raw_text = fixture_path.read_text(encoding="utf-8")

    report = parse_report(raw_text)
    explanation = explain_report(report)

    output = explanation.format_text()

    assert "ERROR TYPE\nHeap buffer overflow" in output
    assert "WHERE\n/home/student/projects/buffer_test.cpp:14 (in function 'main')" in output
    assert "reading 4 byte(s)" in output
    assert "4 byte(s) past the end of a 40-byte allocated heap buffer" in output
    assert "allocated at /home/student/projects/buffer_test.cpp:10" in output
    assert "WHAT TO CHECK NEXT" in output
    assert "LIMITATIONS" in output


def test_unsupported_or_empty_report():
    report = parse_report("Random crash text with no AddressSanitizer headers")
    explanation = explain_report(report)

    assert "Unsupported or Unrecognized Report" in explanation.error_type
