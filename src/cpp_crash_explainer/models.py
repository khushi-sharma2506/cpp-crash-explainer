"""Data structures representing parsed AddressSanitizer report information."""

from dataclasses import dataclass
from typing import Optional, List


@dataclass
class StackFrame:
    frame_number: int
    address: str
    function_name: str
    file_path: Optional[str] = None
    line_number: Optional[int] = None


@dataclass
class SanitizerReport:
    raw_text: str
    error_type: Optional[str] = None
    target_address: Optional[str] = None
    access_type: Optional[str] = None  # e.g., READ or WRITE
    access_size: Optional[int] = None  # in bytes
    crash_file: Optional[str] = None
    crash_line: Optional[int] = None
    crash_function: Optional[str] = None
    
    # Deallocation / Free details (e.g. heap-use-after-free)
    deallocation_file: Optional[str] = None
    deallocation_line: Optional[int] = None

    # Allocation details
    allocation_file: Optional[str] = None
    allocation_line: Optional[int] = None
    allocation_size: Optional[int] = None
    
    # Buffer overflow details
    overflow_offset_bytes: Optional[int] = None
    overflow_direction: Optional[str] = None  # 'right' (past end), 'left', or 'inside'
    overflow_variable_name: Optional[str] = None

    # LeakSanitizer details
    leaked_bytes: Optional[int] = None
    leaked_allocations_count: Optional[int] = None

    # Stack frames
    frames: List[StackFrame] = None

    def __post_init__(self):
        if self.frames is None:
            self.frames = []
