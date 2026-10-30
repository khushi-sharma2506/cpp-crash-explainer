// Real-time dynamic state synchronization with LeetCode

let lastRenderedErrorText = "";

function extractLeetCodeCrashLine(rawText) {
  const match = rawText.match(/Line\s+(\d+)\s*:/i);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  const traceMatch = rawText.match(/solution\.cpp:(\d+)/i);
  if (traceMatch && traceMatch[1]) {
    return parseInt(traceMatch[1], 10);
  }
  return 1;
}

function parseAndExplainSanitizer(rawText) {
  const isHeapOverflow = /heap-buffer-overflow/i.test(rawText);
  const isUAF = /heap-use-after-free|use-after-free/i.test(rawText);
  const isStackOverflow = /stack-buffer-overflow/i.test(rawText);
  const isEmptyVector = /stl_vector\.h|reference binding to null pointer.*stl_vector/i.test(rawText);
  const isNullDeref = /null pointer|load of null pointer|SEGV.*0x0/i.test(rawText);
  const isDivByZero = /division by zero|floating point exception|SIGFPE|remainder by zero/i.test(rawText);
  const isBadAlloc = /std::bad_alloc|out of memory/i.test(rawText);
  const isOutOfRange = /std::out_of_range/i.test(rawText);

  const lineNo = extractLeetCodeCrashLine(rawText);
  const location = `Line ${lineNo} in solution.cpp`;

  if (isDivByZero) {
    return {
      type: "Division by Zero (SIGFPE / UBSan)",
      happened: "Your code attempted to perform division or modulo ('%' or '/') by 0.",
      where: location,
      details: "Hardware floating point exception or integer division by zero.",
      nextSteps: [
        `Inspect Line ${lineNo}: verify the divisor variable or denominator.`,
        "Add a guard check before dividing: 'if (denominator == 0) return ...;'",
        "Check loop or counter variables that decrement down to 0."
      ]
    };
  }

  if (isBadAlloc) {
    return {
      type: "Out of Memory (std::bad_alloc)",
      happened: "Your program requested more heap memory than LeetCode allows.",
      where: location,
      details: "Memory allocation failed: vector or array size is too large.",
      nextSteps: [
        `Inspect Line ${lineNo}: check the size requested (e.g. 'vector<int> dp(1e9)').`,
        "Reduce memory complexity: use O(1) space instead of O(N) or O(N^2).",
        "Use a hash map instead of allocating huge static arrays."
      ]
    };
  }

  if (isOutOfRange) {
    return {
      type: "Index Out of Range (std::out_of_range)",
      happened: "Called '.at(index)' on a vector with an invalid index.",
      where: location,
      details: "std::out_of_range exception thrown by bounds-checked container call.",
      nextSteps: [
        `Inspect Line ${lineNo}: verify the index passed to '.at()'.`,
        "Check container bounds: valid indices are 0 to size-1."
      ]
    };
  }

  if (isEmptyVector) {
    return {
      type: "Empty Vector Out-Of-Bounds (UBSan)",
      happened: "You attempted to access an element of an empty std::vector (size 0).",
      where: location,
      details: "In C++, indexing an empty vector binds a reference to a null address (0x0).",
      nextSteps: [
        `Inspect Line ${lineNo}: verify whether the vector was empty before indexing.`,
        "Always check '!vec.empty()' before indexing 'vec[0]'.",
        "Initialize with an explicit size or add elements via 'push_back()'."
      ]
    };
  }

  if (isNullDeref) {
    return {
      type: "Null Pointer Dereference (SEGV / UBSan)",
      happened: "Attempted to access memory or a member using a null pointer (nullptr).",
      where: location,
      details: "A segmentation fault or invalid load occurred at null memory (0x0).",
      nextSteps: [
        `Inspect Line ${lineNo}: check which pointer or node is being dereferenced.`,
        "Add a guard check before accessing: 'if (ptr != nullptr) { ... }'",
        "In Linked List or Tree problems, verify 'if (!root)' before accessing 'root->val' or 'root->next'."
      ]
    };
  }

  if (isHeapOverflow) {
    return {
      type: "Heap Buffer Overflow (AddressSanitizer)",
      happened: "Your code attempted to access memory beyond the valid boundaries of a vector or array.",
      where: location,
      details: "Memory access occurred past the allocated container capacity.",
      nextSteps: [
        `Inspect Line ${lineNo}: an index was accessed past valid range (valid indices are 0 to size-1).`,
        "Remember: in an array of size N, valid indices are strictly 0 to N-1.",
        "Check your loop conditions: ensure you iterate with '< nums.size()' instead of '<='.",
        "If you are indexing a DP table 'dp[n]', ensure you sized it as 'vector<int> dp(n + 1);'."
      ]
    };
  }

  if (isUAF) {
    return {
      type: "Heap Use-After-Free (AddressSanitizer)",
      happened: "Your code accessed an object or pointer that was already freed or deleted.",
      where: location,
      details: "Memory was read or written after the object was deleted from the heap.",
      nextSteps: [
        `Inspect Line ${lineNo}: verify if 'delete' was called on this pointer earlier.`,
        "Avoid accessing pointers after delete; set them to 'nullptr' immediately."
      ]
    };
  }

  if (isStackOverflow) {
    return {
      type: "Stack Buffer Overflow (AddressSanitizer)",
      happened: "Your code wrote past the boundary of a local fixed-size array on the stack.",
      where: location,
      details: "Local stack variable boundary overrun.",
      nextSteps: [
        `Inspect Line ${lineNo}: check local array indexing bounds.`,
        "Prefer using std::vector<int> instead of fixed-size raw C arrays."
      ]
    };
  }

  return {
    type: "C++ Runtime Error",
    happened: "A runtime error was reported by the compiler sanitizer.",
    where: location,
    details: "Detected invalid pointer operation, out-of-bounds access, or undefined behavior.",
    nextSteps: [
      `Check Line ${lineNo} for array boundaries, divisors, and pointer validity.`
    ]
  };
}

function removeExplainerUI() {
  lastRenderedErrorText = "";
  const oldFab = document.getElementById("cpp-explainer-fab");
  if (oldFab) oldFab.remove();
  const oldDrawer = document.getElementById("cpp-explainer-drawer");
  if (oldDrawer) oldDrawer.remove();
}

function updateOrMountDrawer(explanation) {
  // If drawer already exists, update its content dynamically in-place!
  const drawer = document.getElementById("cpp-explainer-drawer");
  if (drawer) {
    const body = drawer.querySelector(".cpp-drawer-body");
    if (body) {
      body.innerHTML = `
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
    return;
  }

  // Otherwise, create fresh FAB and Drawer
  const fab = document.createElement("button");
  fab.id = "cpp-explainer-fab";
  fab.className = "cpp-explainer-fab";
  fab.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>
    <span>Explain C++ Crash</span>
  `;

  const newDrawer = document.createElement("div");
  newDrawer.id = "cpp-explainer-drawer";
  newDrawer.className = "cpp-explainer-drawer";
  newDrawer.innerHTML = `
    <div class="cpp-drawer-header">
      <div class="cpp-drawer-title">
        C++ CRASH EXPLAINER (by cpp-crash-explainer)
      </div>
      <button id="cpp-drawer-close" class="cpp-drawer-close">✕</button>
    </div>
    <div class="cpp-drawer-body">
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
    </div>
  `;

  document.body.appendChild(fab);
  document.body.appendChild(newDrawer);

  fab.addEventListener("click", () => {
    const isOpen = newDrawer.classList.contains("open");
    if (isOpen) {
      newDrawer.classList.remove("open");
      fab.classList.remove("shifted");
      fab.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>
        <span>Explain C++ Crash</span>
      `;
    } else {
      newDrawer.classList.add("open");
      fab.classList.add("shifted");
      fab.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        <span>Close Panel</span>
      `;
    }
  });

  newDrawer.querySelector("#cpp-drawer-close").addEventListener("click", () => {
    newDrawer.classList.remove("open");
    fab.classList.remove("shifted");
    fab.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>
      <span>Explain C++ Crash</span>
    `;
  });
}

function syncActiveErrorState() {
  // Only search inside the active test result pane to be 100% current
  const resultPane = document.querySelector('[data-layout-path="testcase.result"]') || document.querySelector('.test-result-wrapper') || document.body;

  let activeErrorText = "";
  const elements = resultPane.querySelectorAll("pre, code, div");
  for (const el of elements) {
    const text = el.innerText || "";
    if (
      (text.includes("Sanitizer") || text.includes("runtime error:") || text.includes("division by zero") || text.includes("bad_alloc") || text.includes("SIGFPE")) &&
      el.children.length < 5
    ) {
      activeErrorText = text;
      break;
    }
  }

  // 1. If NO error is currently displayed in the Test Result tab, remove the panel and button immediately!
  if (!activeErrorText || activeErrorText.trim().length === 0) {
    if (document.getElementById("cpp-explainer-fab")) {
      removeExplainerUI();
    }
    return;
  }

  // 2. If the error text changed (user ran new code or a different error occurred), update the drawer dynamically!
  if (activeErrorText !== lastRenderedErrorText) {
    lastRenderedErrorText = activeErrorText;
    const explanation = parseAndExplainSanitizer(activeErrorText);
    updateOrMountDrawer(explanation);
  }
}

// Check every 600ms for instant real-time responsiveness
setInterval(syncActiveErrorState, 600);
