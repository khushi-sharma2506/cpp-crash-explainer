"""Explanation rules for supported sanitizer error categories."""

from dataclasses import dataclass
from typing import Optional
from cpp_crash_explainer.models import SanitizerReport


@dataclass
class Explanation:
    error_type: str
    what_happened: str
    where: str
    what_the_report_tells_us: str
    what_to_check_next: str
    limitations: str

    def format_text(self) -> str:
        """Render the explanation in the standard user-facing format."""
        return (
            "C++ CRASH EXPLAINER\n\n"
            f"ERROR TYPE\n{self.error_type}\n\n"
            f"WHAT HAPPENED\n{self.what_happened}\n\n"
            f"WHERE\n{self.where}\n\n"
            f"WHAT THE REPORT TELLS US\n{self.what_the_report_tells_us}\n\n"
            f"WHAT TO CHECK NEXT\n{self.what_to_check_next}\n\n"
            f"LIMITATIONS\n{self.limitations}"
        )


def _format_where(report: SanitizerReport) -> str:
    if report.crash_file and report.crash_line:
        loc = f"{report.crash_file}:{report.crash_line}"
        if report.crash_function:
            loc += f" (in function '{report.crash_function}')"
        return loc
    return "Source file and line number are not available in this report."


def explain_heap_buffer_overflow(report: SanitizerReport) -> Explanation:
    details = []
    if report.access_type and report.access_size:
        op = "reading" if report.access_type == "READ" else "writing"
        details.append(f"The program crashed while {op} {report.access_size} byte(s).")
    
    if report.overflow_offset_bytes is not None and report.allocation_size is not None:
        direction_phrase = "past the end of" if report.overflow_direction == "right" else "before the start of"
        details.append(
            f"The memory access occurred {report.overflow_offset_bytes} byte(s) {direction_phrase} a "
            f"{report.allocation_size}-byte allocated heap buffer."
        )

    if report.allocation_file and report.allocation_line:
        details.append(f"The heap buffer was allocated at {report.allocation_file}:{report.allocation_line}.")

    tells_us = " ".join(details) if details else "The report indicates a heap buffer overflow occurred."

    return Explanation(
        error_type="Heap buffer overflow",
        what_happened=(
            "The program attempted to read or write memory outside the valid boundaries "
            "of a dynamically allocated (heap) array or object."
        ),
        where=_format_where(report),
        what_the_report_tells_us=tells_us,
        what_to_check_next=(
            "1. Check the array/buffer indexing at the crash location to see if the index exceeds the size.\n"
            "2. Remember that in C++, an array of size N has valid indices from 0 to N-1 (off-by-one errors are common).\n"
            "3. Check loop bounds (e.g., using '<=' instead of '<').\n"
            "4. If using raw pointers or manual allocation (new[] / malloc), verify that the allocated byte size matches the data type."
        ),
        limitations=(
            "AddressSanitizer detects that an out-of-bounds address was accessed, but it cannot know what value "
            "you intended to calculate or why the index became invalid. Inspect the logic leading up to the access."
        ),
    )


def explain_heap_use_after_free(report: SanitizerReport) -> Explanation:
    details = []
    if report.access_type and report.access_size:
        op = "reading" if report.access_type == "READ" else "writing"
        details.append(f"The program crashed while {op} {report.access_size} byte(s) of already-freed memory.")

    if report.allocation_size:
        details.append(f"The original buffer was {report.allocation_size} byte(s).")

    if report.deallocation_file and report.deallocation_line:
        details.append(f"The memory was previously deallocated (freed/deleted) at {report.deallocation_file}:{report.deallocation_line}.")

    if report.allocation_file and report.allocation_line:
        details.append(f"It was originally allocated at {report.allocation_file}:{report.allocation_line}.")

    tells_us = " ".join(details) if details else "The program accessed memory that was previously freed."

    return Explanation(
        error_type="Heap use-after-free",
        what_happened=(
            "The program attempted to access (read or write) a memory location on the heap that has already "
            "been released using 'delete' or 'free'."
        ),
        where=_format_where(report),
        what_the_report_tells_us=tells_us,
        what_to_check_next=(
            "1. Look at the deallocation location mentioned above: was the object deleted prematurely?\n"
            "2. Check if a pointer or reference to the deleted object was retained and used later (a 'dangling pointer').\n"
            "3. If multiple parts of code share this pointer, consider using modern C++ smart pointers (e.g. std::shared_ptr or std::unique_ptr) instead of raw delete.\n"
            "4. If manual delete is required, set the pointer to 'nullptr' immediately after deleting it to prevent subtle reuse."
        ),
        limitations=(
            "AddressSanitizer pinpoints where the memory was freed and where it was later accessed, but it cannot determine "
            "which code owner should have maintained ownership of the memory."
        ),
    )


def explain_stack_buffer_overflow(report: SanitizerReport) -> Explanation:
    details = []
    if report.access_type and report.access_size:
        op = "reading" if report.access_type == "READ" else "writing"
        details.append(f"The program crashed while {op} {report.access_size} byte(s).")

    if report.overflow_variable_name:
        details.append(f"The out-of-bounds access overflowed the stack variable '{report.overflow_variable_name}'.")

    tells_us = " ".join(details) if details else "The program accessed an address outside a local stack variable's boundaries."

    return Explanation(
        error_type="Stack buffer overflow",
        what_happened=(
            "The program accessed memory outside the bounds of a local variable allocated on the call stack "
            "(for example, a fixed-size local array like 'int buf[10]')."
        ),
        where=_format_where(report),
        what_the_report_tells_us=tells_us,
        what_to_check_next=(
            "1. Inspect the local array or buffer declared in the function where the crash happened.\n"
            "2. Verify loop boundaries and indexing operations accessing this local array.\n"
            "3. If using functions like strcpy, sprintf, or scanf, ensure they cannot write more bytes than the array holds (or switch to std::string / std::vector / snprintf).\n"
            "4. Check for off-by-one errors when writing to the last element of the stack buffer."
        ),
        limitations=(
            "AddressSanitizer identifies which local stack variable was overflowed, but cannot know whether the index was "
            "computed incorrectly or if the input size was larger than anticipated."
        ),
    )


def explain_null_pointer_dereference(report: SanitizerReport) -> Explanation:
    details = []
    if report.target_address:
        details.append(f"A segmentation fault occurred attempting to access memory address {report.target_address}.")
    if report.access_type:
        op = "reading from" if report.access_type == "READ" else "writing to"
        details.append(f"The crash happened during a {op} this address.")

    details.append("The address is 0x0 or within the system's zero-page (null memory range).")
    tells_us = " ".join(details)

    return Explanation(
        error_type="Null pointer dereference",
        what_happened=(
            "The program crashed because it attempted to read or write memory using a null pointer (or uninitialized pointer pointing near 0x0)."
        ),
        where=_format_where(report),
        what_the_report_tells_us=tells_us,
        what_to_check_next=(
            "1. Inspect the pointers and object references being dereferenced (using '->' or '*') at the crash location.\n"
            "2. Verify whether a function returning a pointer (such as a search or lookup function) returned nullptr on failure.\n"
            "3. Add a check 'if (ptr != nullptr)' before accessing the pointer.\n"
            "4. Ensure all pointer member variables are initialized in constructors."
        ),
        limitations=(
            "Sanitizers capture the SEGV at address 0x0, but cannot trace where the null pointer originated or why "
            "a valid object pointer was expected. You must trace the variable's assignment history."
        ),
    )


def explain_memory_leak(report: SanitizerReport) -> Explanation:
    details = []
    if report.leaked_bytes is not None and report.leaked_allocations_count is not None:
        details.append(f"LeakSanitizer detected {report.leaked_bytes} byte(s) leaked across {report.leaked_allocations_count} allocation(s).")
    elif report.leaked_bytes is not None:
        details.append(f"LeakSanitizer detected {report.leaked_bytes} byte(s) leaked.")

    if report.allocation_file and report.allocation_line:
        details.append(f"The leaked memory was allocated at {report.allocation_file}:{report.allocation_line}.")

    tells_us = " ".join(details) if details else "LeakSanitizer detected memory that was allocated but never deallocated."

    # For leaks, the 'crash' location is usually the allocation location or program exit
    where = "Program exit (LeakSanitizer report)"
    if report.allocation_file and report.allocation_line:
        where = f"Allocated at {report.allocation_file}:{report.allocation_line}"

    return Explanation(
        error_type="Memory leak",
        what_happened=(
            "The program allocated dynamic heap memory (using new, new[], or malloc) that was never released "
            "with delete, delete[], or free before the program exited."
        ),
        where=where,
        what_the_report_tells_us=tells_us,
        what_to_check_next=(
            "1. Check the allocation site listed in the report to find what object or array was created.\n"
            "2. Trace who is responsible for deleting this object when it is no longer needed.\n"
            "3. Ensure every 'new' has a matching 'delete', and every 'new[]' has a matching 'delete[]'.\n"
            "4. Prefer using modern RAII types (such as std::vector, std::string, std::unique_ptr) instead of manual memory management."
        ),
        limitations=(
            "LeakSanitizer reports allocations that were still reachable or un-freed when execution finished, "
            "but it cannot know where in your program's lifecycle the memory became obsolete."
        ),
    )


def explain_report(report: SanitizerReport) -> Explanation:
    """Entry point to explain any supported sanitizer report."""
    if not report.error_type:
        return Explanation(
            error_type="Unsupported or Unrecognized Report",
            what_happened="The input does not appear to contain a recognized AddressSanitizer or LeakSanitizer error header.",
            where="Unknown",
            what_the_report_tells_us="No standard AddressSanitizer diagnostic pattern was identified.",
            what_to_check_next="Verify that you provided the full standard error output produced by AddressSanitizer.",
            limitations="The tool requires diagnostic reports generated with '-fsanitize=address'."
        )

    norm_type = report.error_type.replace("-", "_").lower()

    if "heap_buffer_overflow" in norm_type:
        return explain_heap_buffer_overflow(report)
    elif "heap_use_after_free" in norm_type or "use_after_free" in norm_type:
        return explain_heap_use_after_free(report)
    elif "stack_buffer_overflow" in norm_type:
        return explain_stack_buffer_overflow(report)
    elif "segv" in norm_type:
        # Check if address is null/zero
        if report.target_address and int(report.target_address, 16) < 4096:
            return explain_null_pointer_dereference(report)
        return Explanation(
            error_type="Segmentation Fault (SEGV)",
            what_happened=f"The program crashed accessing invalid address {report.target_address or 'unknown'}.",
            where=_format_where(report),
            what_the_report_tells_us=f"A SEGV signal occurred at memory address {report.target_address or 'unknown'}.",
            what_to_check_next="Check pointer arithmetic, uninitialized variables, or wild pointer values.",
            limitations="The exact root cause cannot be derived purely from the SEGV address."
        )
    elif "memory_leak" in norm_type or "leak" in norm_type:
        return explain_memory_leak(report)

    return Explanation(
        error_type=f"Unsupported Error Type: {report.error_type}",
        what_happened=f"AddressSanitizer reported '{report.error_type}', which is not yet supported in this version.",
        where=_format_where(report),
        what_the_report_tells_us="The error type was identified, but a detailed rule has not yet been implemented.",
        what_to_check_next="Refer to the official AddressSanitizer documentation for this specific diagnostic type.",
        limitations="Supported in v0.1: heap-buffer-overflow, heap-use-after-free, stack-buffer-overflow, null-deref, memory-leak."
    )
