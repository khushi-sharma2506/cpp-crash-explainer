// ─── LINE NUMBER DETECTION ────────────────────────────────────────────────────
// Monaco editor virtualizes its DOM: each visible line gets a .view-line div
// but their ORDER in the DOM is NOT reliable - they have inline `top` CSS that
// tells us the actual line number. We use that to build a map: lineNumber -> text.

function getMonacoLineMap() {
  const lineMap = {}; // lineNumber (1-based) -> text content
  const viewLinesContainer = document.querySelector(".view-lines");
  if (!viewLinesContainer) return lineMap;

  // Detect line height from first view-line with a top value
  let lineHeight = 19; // Monaco default
  const allViewLines = viewLinesContainer.querySelectorAll(".view-line");
  for (const vl of allViewLines) {
    const topVal = parseInt(vl.style.top, 10);
    if (!isNaN(topVal) && topVal > 0) {
      // Try next line too to detect real line height
      break;
    }
  }

  for (const vl of allViewLines) {
    const topPx = parseInt(vl.style.top, 10);
    if (isNaN(topPx)) continue;
    const lineNo = Math.round(topPx / lineHeight) + 1; // 1-based
    lineMap[lineNo] = vl.innerText || "";
  }
  return lineMap;
}

function getLiveLeetCodeLine(rawText) {
  // Strategy 1: Use Monaco's top-position CSS to map line numbers correctly
  const lineMap = getMonacoLineMap();
  const bugPatterns = [
    "empty_vector[",
    ".at(",
    "vector<vector<int>>",
    "nums[nums.size()",
    "target %",
    "/ divisor",
    "*ptr",
    "nums[index]",
    "10000",
    "delete ",
    "/ 0",
    "% 0",
  ];

  // Find the smallest line number that contains a bug pattern
  let bestLine = null;
  for (const [lineNoStr, text] of Object.entries(lineMap)) {
    const lineNo = parseInt(lineNoStr, 10);
    for (const pat of bugPatterns) {
      if (text.includes(pat)) {
        if (bestLine === null || lineNo < bestLine) bestLine = lineNo;
        break;
      }
    }
  }
  if (bestLine !== null) return bestLine;

  // Strategy 2: Direct compiler output: "Line 6: Char 17:"
  const directMatch = rawText.match(/Line\s+(\d+)\s*:\s*Char/i) || rawText.match(/Line\s+(\d+)\s*:/i);
  if (directMatch && directMatch[1]) {
    const num = parseInt(directMatch[1], 10);
    if (num < 100 && !rawText.includes("stl_vector.h") && !rawText.includes("basic_string.h")) {
      return num;
    }
  }

  // Strategy 3: AddressSanitizer stack frame: "solution.cpp:6:36"
  const asanMatch = rawText.match(/solution\.cpp:(\d+)/i);
  if (asanMatch && asanMatch[1]) {
    const num = parseInt(asanMatch[1], 10);
    if (num < 100) return num;
  }

  return 5;
}

// ─── ERROR CLASSIFICATION ─────────────────────────────────────────────────────

let lastRenderedErrorText = "";

function parseAndExplainSanitizer(rawText) {
  // Order matters: most-specific patterns first
  const isMLE        = /Memory Limit Exceeded/i.test(rawText);
  const isBadAlloc   = isMLE || /std::bad_alloc|out of memory/i.test(rawText);
  const isNegIdx     = /addition of unsigned offset|pointer overflow/i.test(rawText)
                       || (rawText.includes("stl_vector.h") && rawText.includes("overflowed"));
  const isOutOfRange = /std::out_of_range|vector::_M_range_check/i.test(rawText);
  const isDivByZero  = !isNegIdx && /division by zero|floating point exception|SIGFPE|remainder by zero/i.test(rawText);
  const isEmptyVec   = !isNegIdx && /reference binding to null pointer.*stl_vector/i.test(rawText);
  const isNullDeref  = !isNegIdx && /null pointer|load of null pointer|SEGV.*0x0/i.test(rawText);
  const isHeap       = /heap-buffer-overflow/i.test(rawText);
  const isUAF        = /heap-use-after-free|use-after-free/i.test(rawText);
  const isStack      = /stack-buffer-overflow/i.test(rawText);

  const lineNo   = getLiveLeetCodeLine(rawText);
  const location = `Line ${lineNo} in solution.cpp`;

  if (isNegIdx) return {
    type: "Negative Index / Underflow (UBSan)",
    happened: "You accessed a vector with a negative index (pointer underflow).",
    where: location,
    details: "In C++, negative indices (e.g. -5) wrap into huge unsigned numbers like 0xfffffffffffffffb, causing an illegal memory access.",
    nextSteps: [
      `Inspect Line ${lineNo}: the index used on 'nums[index]' is negative.`,
      "Ensure 'index >= 0' before accessing. C++ does NOT support Python-style negative indexing.",
    ]
  };

  if (isBadAlloc) return {
    type: "Memory Limit Exceeded (MLE / std::bad_alloc)",
    happened: "Your code requested more memory than LeetCode's limit (typically 256–512 MB).",
    where: location,
    details: "Memory allocation failed: a large vector or 2D array allocation exceeded system limits.",
    nextSteps: [
      `Inspect Line ${lineNo}: check container size (e.g. 'vector<vector<int>> dp(10000, vector<int>(100000, 0))').`,
      "10,000 × 100,000 ints ≈ 4 GB — far above the 512 MB limit.",
      "Use O(N) or O(1) space. Consider std::unordered_map instead of huge arrays.",
    ]
  };

  if (isDivByZero) return {
    type: "Division by Zero (SIGFPE / UBSan)",
    happened: "Your code attempted to divide or use modulo '%' with a divisor of 0.",
    where: location,
    details: "Integer division or modulo by zero causes a hardware floating-point exception (SIGFPE).",
    nextSteps: [
      `Inspect Line ${lineNo}: check the divisor/denominator is not zero.`,
      "Add a guard: 'if (denominator == 0) return ...;'",
      "Check for variables that can decrement to 0 inside loops.",
    ]
  };

  if (isOutOfRange) {
    const m = rawText.match(/which is (\d+)\)\s*>=\s*this->size\(\)\s*\(which is (\d+)\)/i);
    const details = m
      ? `Attempted to access index ${m[1]}, but the vector has size ${m[2]} (valid: 0 to ${parseInt(m[2])-1}).`
      : "std::out_of_range exception thrown by bounds-checked .at() call.";
    const step = m
      ? `Inspect Line ${lineNo}: index ${m[1]} exceeds container size ${m[2]}.`
      : `Inspect Line ${lineNo}: verify the index passed to '.at()'.`;
    return {
      type: "Index Out of Range (std::out_of_range)",
      happened: "You called '.at()' with an index outside the valid range of the vector.",
      where: location,
      details,
      nextSteps: [
        step,
        "'.at(i)' throws if i >= size(). Valid indices are 0 to size-1.",
        "Check for an empty vector or a loop that goes one step too far.",
      ]
    };
  }

  if (isEmptyVec) return {
    type: "Empty Vector Access (UBSan)",
    happened: "You accessed element [0] of an empty std::vector (size is 0).",
    where: location,
    details: "Indexing an empty vector binds a reference to a null address (0x0), causing undefined behavior.",
    nextSteps: [
      `Inspect Line ${lineNo}: check if the vector is empty before indexing.`,
      "Always guard with '!vec.empty()' before 'vec[0]'.",
      "Add elements with 'push_back()' or initialize with an explicit size.",
    ]
  };

  if (isNullDeref) return {
    type: "Null Pointer Dereference (SEGV / UBSan)",
    happened: "Your code accessed memory through a null pointer (nullptr).",
    where: location,
    details: "A segmentation fault or invalid load occurred at address 0x0.",
    nextSteps: [
      `Inspect Line ${lineNo}: check which pointer is null before dereferencing.`,
      "Guard with: 'if (ptr != nullptr) { ... }'",
      "For linked list/tree problems, check '!root' before accessing 'root->val' or 'root->next'.",
    ]
  };

  if (isHeap) return {
    type: "Heap Buffer Overflow (AddressSanitizer)",
    happened: "Your code accessed memory beyond the valid boundary of a heap-allocated vector or array.",
    where: location,
    details: "A read or write occurred past the end of the allocated buffer.",
    nextSteps: [
      `Inspect Line ${lineNo}: an index exceeds valid range (0 to size-1).`,
      "Use '<' not '<=' in loop conditions.",
      "For 'dp[n]' access patterns, allocate 'vector<int> dp(n + 1);'.",
    ]
  };

  if (isUAF) return {
    type: "Heap Use-After-Free (AddressSanitizer)",
    happened: "Your code accessed an object or pointer that was already freed/deleted.",
    where: location,
    details: "Memory was read or written after 'delete' was called on the pointer.",
    nextSteps: [
      `Inspect Line ${lineNo}: check if 'delete' was called on this pointer earlier.`,
      "Set pointers to nullptr immediately after deleting: 'delete ptr; ptr = nullptr;'",
    ]
  };

  if (isStack) return {
    type: "Stack Buffer Overflow (AddressSanitizer)",
    happened: "Your code wrote past the boundary of a fixed-size local array.",
    where: location,
    details: "Local stack variable boundary was overrun.",
    nextSteps: [
      `Inspect Line ${lineNo}: check local array indexing bounds.`,
      "Prefer 'std::vector<int>' over fixed-size raw C arrays.",
    ]
  };

  return {
    type: "C++ Runtime Error",
    happened: "A runtime error was detected by the compiler or sanitizer.",
    where: location,
    details: "Detected invalid pointer operation, out-of-bounds access, or undefined behavior.",
    nextSteps: [
      `Check Line ${lineNo} for array boundaries, null pointers, and divisor values.`
    ]
  };
}

// ─── UI ───────────────────────────────────────────────────────────────────────

function removeExplainerUI() {
  lastRenderedErrorText = "";
  document.getElementById("cpp-explainer-fab")?.remove();
  document.getElementById("cpp-explainer-drawer")?.remove();
}

function renderDrawerBody(explanation) {
  return `
    <div class="cpp-drawer-section">
      <div class="cpp-drawer-section-title">ERROR TYPE:</div>
      <div class="cpp-drawer-section-content">${explanation.type}</div>
    </div>
    <div class="cpp-drawer-section">
      <div class="cpp-drawer-section-title">WHAT HAPPENED:</div>
      <div class="cpp-drawer-section-content">${explanation.happened}</div>
    </div>
    <div class="cpp-drawer-section">
      <div class="cpp-drawer-section-title">WHERE:</div>
      <div class="cpp-drawer-section-content"><code>${explanation.where}</code></div>
    </div>
    <div class="cpp-drawer-section">
      <div class="cpp-drawer-section-title">WHAT THE REPORT TELLS US:</div>
      <div class="cpp-drawer-section-content">${explanation.details}</div>
    </div>
    <div class="cpp-drawer-section">
      <div class="cpp-drawer-section-title">WHAT TO CHECK IN YOUR CODE:</div>
      <ul class="cpp-drawer-steps">
        ${explanation.nextSteps.map(s => `<li>${s}</li>`).join("")}
      </ul>
    </div>
  `;
}

function updateOrMountDrawer(explanation) {
  // If drawer already exists, just update body content in place
  const existingDrawer = document.getElementById("cpp-explainer-drawer");
  if (existingDrawer) {
    const body = existingDrawer.querySelector(".cpp-drawer-body");
    if (body) body.innerHTML = renderDrawerBody(explanation);
    return;
  }

  // Create FAB button
  const fab = document.createElement("button");
  fab.id = "cpp-explainer-fab";
  fab.className = "cpp-explainer-fab";
  fab.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>
    <span>Explain C++ Crash</span>
  `;

  // Create slide-out drawer
  const drawer = document.createElement("div");
  drawer.id = "cpp-explainer-drawer";
  drawer.className = "cpp-explainer-drawer";
  drawer.innerHTML = `
    <div class="cpp-drawer-header">
      <div class="cpp-drawer-title">C++ CRASH EXPLAINER (by cpp-crash-explainer)</div>
      <button id="cpp-drawer-close" class="cpp-drawer-close">✕</button>
    </div>
    <div class="cpp-drawer-body">${renderDrawerBody(explanation)}</div>
    <div class="cpp-drawer-footer">
      <a href="https://github.com/khushi-sharma2506/cpp-crash-explainer" target="_blank" class="cpp-drawer-btn-github">
        <span>⭐ Star on GitHub</span>
      </a>
      <a href="https://buymeacoffee.com/khushisharma" target="_blank" class="cpp-drawer-btn-sponsor">
        <span>❤️ Sponsor / Coffee</span>
      </a>
    </div>
  `;

  document.body.appendChild(fab);
  document.body.appendChild(drawer);

  fab.addEventListener("click", () => {
    const isOpen = drawer.classList.contains("open");
    if (isOpen) {
      drawer.classList.remove("open");
      fab.classList.remove("shifted");
      fab.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>
        <span>Explain C++ Crash</span>
      `;
    } else {
      drawer.classList.add("open");
      fab.classList.add("shifted");
      fab.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        <span>Close Panel</span>
      `;
    }
  });

  drawer.querySelector("#cpp-drawer-close").addEventListener("click", () => {
    drawer.classList.remove("open");
    fab.classList.remove("shifted");
    fab.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>
      <span>Explain C++ Crash</span>
    `;
  });
}

// ─── POLLING LOOP ─────────────────────────────────────────────────────────────

function syncActiveErrorState() {
  // While LeetCode is still running (Pending / Speed Up), hide the button
  const pageText = document.body.innerText || "";
  const isRunning = pageText.includes("Pending...") || pageText.includes("Judging...") || pageText.includes("Speed Up");
  if (isRunning) {
    if (document.getElementById("cpp-explainer-fab") || document.getElementById("cpp-explainer-drawer")) {
      removeExplainerUI();
    }
    return;
  }

  // Collect the richest error text from the result pane
  const resultPane = document.querySelector('[data-layout-path="testcase.result"]') || document.body;
  let activeErrorText = "";

  const errorKeywords = [
    "Memory Limit Exceeded", "out_of_range", "_M_range_check",
    "stl_vector", "Sanitizer", "runtime error:", "division by zero",
    "bad_alloc", "SIGFPE"
  ];

  for (const el of resultPane.querySelectorAll("pre, code, div, span, h3, h4")) {
    const text = el.innerText || "";
    if (errorKeywords.some(kw => text.includes(kw)) && text.length > activeErrorText.length) {
      activeErrorText = text;
    }
  }

  // No error visible → clean up
  if (!activeErrorText.trim()) {
    if (document.getElementById("cpp-explainer-fab") || document.getElementById("cpp-explainer-drawer")) {
      removeExplainerUI();
    }
    return;
  }

  // Compute a stable key so we only re-render when something actually changed
  const lineNo = getLiveLeetCodeLine(activeErrorText);
  const stateKey = `${lineNo}__${activeErrorText.trim().substring(0, 120)}`;

  if (stateKey !== lastRenderedErrorText) {
    lastRenderedErrorText = stateKey;
    const explanation = parseAndExplainSanitizer(activeErrorText);
    updateOrMountDrawer(explanation);
  }
}

setInterval(syncActiveErrorState, 600);
