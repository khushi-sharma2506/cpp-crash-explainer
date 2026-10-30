"""Parser for AddressSanitizer and LeakSanitizer diagnostic reports."""

import re
from typing import Optional, List
from cpp_crash_explainer.models import SanitizerReport, StackFrame


# Regex patterns for AddressSanitizer and LeakSanitizer
ERROR_TYPE_PATTERN = re.compile(
    r"ERROR:\s*(?:AddressSanitizer|LeakSanitizer):\s*([a-zA-Z0-9_\-]+(?:\s+on\s+unknown\s+address\s+0x[0-9a-fA-F]+)?)",
    re.IGNORECASE
)

TARGET_ADDRESS_PATTERN = re.compile(
    r"address\s+(0x[0-9a-fA-F]+)", re.IGNORECASE
)

ACCESS_PATTERN = re.compile(
    r"(READ|WRITE)\s+(?:of\s+size\s+(\d+)|memory\s+access)", re.IGNORECASE
)

# Matches stack frames: #0 0x401233 in main /path/to/file.cpp:14
STACK_FRAME_PATTERN = re.compile(
    r"#(\d+)\s+([0-9a-fx]+)\s+in\s+([^\s]+)(?:\s+([^:\s]+):(\d+))?", re.IGNORECASE
)

# Matches: 0x602000000034 is located 4 bytes to the right of 40-byte region
# or: 0x602000000010 is located 0 bytes inside of 16-byte region
OFFSET_REGION_PATTERN = re.compile(
    r"is located\s+(\d+)\s+bytes\s+(to the right|to the left|inside)\s+of\s+(\d+)-byte\s+region",
    re.IGNORECASE
)

# Matches stack variable in stack-buffer-overflow: [32, 72) 'buffer' <== Memory access at offset 80 overflows this variable
STACK_VAR_PATTERN = re.compile(
    r"\[\d+,\s*\d+\)\s+'([^']+)'\s*<==\s*Memory access", re.IGNORECASE
)

# Leak matches: Direct leak of 40 byte(s) in 1 object(s) or SUMMARY: 40 byte(s) leaked in 1 allocation(s)
LEAK_SUMMARY_PATTERN = re.compile(
    r"(\d+)\s+byte\(s\)\s+leaked\s+in\s+(\d+)\s+allocation\(s\)", re.IGNORECASE
)

DIRECT_LEAK_PATTERN = re.compile(
    r"leak\s+of\s+(\d+)\s+byte\(s\)\s+in\s+(\d+)\s+object\(s\)", re.IGNORECASE
)

SUMMARY_PATTERN = re.compile(
    r"SUMMARY:\s*(?:AddressSanitizer|LeakSanitizer):\s*([^\s]+)\s+([^:\s]+):(\d+)\s+in\s+([^\s]+)", re.IGNORECASE
)


def parse_stack_frames(text: str) -> List[StackFrame]:
    """Extract individual stack frames from a report section."""
    frames = []
    for line in text.splitlines():
        match = STACK_FRAME_PATTERN.search(line.strip())
        if match:
            frame_no = int(match.group(1))
            addr = match.group(2)
            func = match.group(3)
            file_path = match.group(4)
            line_no = int(match.group(5)) if match.group(5) else None
            frames.append(StackFrame(
                frame_number=frame_no,
                address=addr,
                function_name=func,
                file_path=file_path,
                line_number=line_no
            ))
    return frames


def find_first_user_frame(frames: List[StackFrame]) -> Optional[StackFrame]:
    """Find the first stack frame outside sanitizer and standard library binaries."""
    for f in frames:
        if f.file_path and not f.file_path.endswith((".so", ".dll", ".dylib", ".so.8", ".so.6")):
            return f
    return None


def parse_report(raw_text: str) -> SanitizerReport:
    """Parse a raw AddressSanitizer/LeakSanitizer report into a structured SanitizerReport model."""
    report = SanitizerReport(raw_text=raw_text)

    # 1. Error Type & Target Address
    err_match = ERROR_TYPE_PATTERN.search(raw_text)
    if err_match:
        full_err = err_match.group(1).strip()
        if "SEGV" in full_err.upper():
            report.error_type = "segv"
        elif "leak" in raw_text.lower():
            report.error_type = "memory-leak"
        else:
            report.error_type = full_err.split()[0].lower()
    elif "leak" in raw_text.lower():
        report.error_type = "memory-leak"

    addr_match = TARGET_ADDRESS_PATTERN.search(raw_text)
    if addr_match:
        report.target_address = addr_match.group(1)

    # 2. Access Type & Size
    acc_match = ACCESS_PATTERN.search(raw_text)
    if acc_match:
        report.access_type = acc_match.group(1).upper()
        if acc_match.group(2):
            report.access_size = int(acc_match.group(2))

    # 3. Buffer region / offset
    region_match = OFFSET_REGION_PATTERN.search(raw_text)
    if region_match:
        report.overflow_offset_bytes = int(region_match.group(1))
        direction_raw = region_match.group(2).lower()
        if "inside" in direction_raw:
            report.overflow_direction = "inside"
        elif "right" in direction_raw:
            report.overflow_direction = "right"
        else:
            report.overflow_direction = "left"
        report.allocation_size = int(region_match.group(3))

    # Stack variable name for stack buffer overflow
    var_match = STACK_VAR_PATTERN.search(raw_text)
    if var_match:
        report.overflow_variable_name = var_match.group(1)

    # 4. Memory Leak metrics
    leak_match = LEAK_SUMMARY_PATTERN.search(raw_text) or DIRECT_LEAK_PATTERN.search(raw_text)
    if leak_match:
        report.leaked_bytes = int(leak_match.group(1))
        report.leaked_allocations_count = int(leak_match.group(2))
        if not report.error_type:
            report.error_type = "memory-leak"

    # 5. Crash location (SUMMARY canonical search)
    sum_match = SUMMARY_PATTERN.search(raw_text)
    if sum_match:
        report.crash_file = sum_match.group(2)
        report.crash_line = int(sum_match.group(3))
        report.crash_function = sum_match.group(4)

    # 6. Parse all stack frames
    frames = parse_stack_frames(raw_text)
    report.frames = frames

    # Fallback for crash file/line if not caught by summary
    if not report.crash_file:
        user_frame = find_first_user_frame(frames)
        if user_frame:
            report.crash_file = user_frame.file_path
            report.crash_line = user_frame.line_number
            report.crash_function = user_frame.function_name

    # 7. Section extraction: 'freed by' and 'allocated by'
    raw_lower = raw_text.lower()
    
    if "freed by" in raw_lower:
        freed_section = raw_text.split("freed by", 1)[1]
        if "allocated by" in freed_section:
            freed_section = freed_section.split("allocated by", 1)[0]
        freed_frames = parse_stack_frames(freed_section)
        user_freed = find_first_user_frame(freed_frames)
        if user_freed:
            report.deallocation_file = user_freed.file_path
            report.deallocation_line = user_freed.line_number

    if "allocated by" in raw_lower or "allocated from:" in raw_lower:
        alloc_split = "allocated by" if "allocated by" in raw_lower else "allocated from:"
        alloc_section = raw_text.split(alloc_split, 1)[1]
        alloc_frames = parse_stack_frames(alloc_section)
        user_alloc = find_first_user_frame(alloc_frames)
        if user_alloc:
            report.allocation_file = user_alloc.file_path
            report.allocation_line = user_alloc.line_number

    return report
