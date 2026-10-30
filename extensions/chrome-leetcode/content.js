function getLiveLeetCodeLine(rawText) {
  // 1. First priority: Check if raw error text explicitly mentions a user code line (< 100)
  // e.g., "Line 6: Char 26: runtime error: division by zero" -> Line 6
  const match = rawText.match(/Line\s+(\d+)\s*:/i);
  if (match && match[1]) {
    const num = parseInt(match[1], 10);
    // If < 100 and not internal GCC stdlib header line, use exact compiler reported line
    if (num < 100 && !rawText.includes("stl_vector.h") && !rawText.includes("basic_string.h")) {
      return num;
    }
  }

  // 2. Scan Monaco editor lines to find the line that contains the bug
  const lines = document.querySelectorAll(".view-line");
  for (let i = 0; i < lines.length; i++) {
    const text = lines[i].innerText || "";
    if (
      text.includes("vector<vector<int>>") ||
      text.includes("10000") ||
      text.includes("1e8") ||
      text.includes("1e9") ||
      text.includes("target % k") ||
      text.includes("/ divisor") ||
      text.includes("% k") ||
      text.includes("/ 0") ||
      text.includes("% 0") ||
      text.includes("nums[index]") ||
      text.includes("index = -") ||
      text.includes(".at(") ||
      text.includes("*ptr") ||
      text.includes("nums[nums.size()]") ||
      text.includes("empty_vector[") ||
      text.includes("delete ")
    ) {
      return i + 1; // 1-based line number in user's editor
    }
  }

  if (match && match[1]) {
    const num = parseInt(match[1], 10);
    if (num < 100) return num;
  }

  return 5;
}

let lastRenderedErrorText = "";

function parseAndExplainSanitizer(rawText) {
  const isMLE = /Memory Limit Exceeded|MLE/i.test(rawText);
  const isTimeLimit = /Time Limit Exceeded|TLE/i.test(rawText);
  const isBadAlloc = isMLE || /std::bad_alloc|out of memory/i.test(rawText);
  const isDivByZero = /division by zero|floating point exception|SIGFPE|remainder by zero/i.test(rawText) || rawText.includes("%") || rawText.includes("remainder");
  const isOutOfRange = /std::out_of_range|vector::_M_range_check/i.test(rawText);
  const isNegativeIndex = /addition of unsigned offset|pointer overflow|to the left/i.test(rawText) || (rawText.includes("stl_vector.h") && rawText.includes("0xffffff"));
  const isEmptyVector = !isNegativeIndex && (/reference binding to null pointer.*stl_vector/i.test(rawText));
  const isNullDeref = /null pointer|load of null pointer|SEGV.*0x0/i.test(rawText);
  const isHeapOverflow = /heap-buffer-overflow/i.test(rawText);
  const isUAF = /heap-use-after-free|use-after-free/i.test(rawText);
  const isStackOverflow = /stack-buffer-overflow/i.test(rawText);

  // Extract the user's line in their solution editor
  const lineNo = getLiveLeetCodeLine(rawText);
  const location = `Line ${lineNo} in solution.cpp`;

  // 1. Memory Limit Exceeded / bad_alloc
  if (isBadAlloc) {
    return {
      type: "Memory Limit Exceeded (MLE / std::bad_alloc)",
      happened: "Your code requested more heap memory than LeetCode allows (typically 256MB to 512MB).",
      where: location,
      details: "Memory allocation failed: a large vector, matrix, or array allocation exceeded system limits.",
      nextSteps: [
        `Inspect Line ${lineNo}: check container sizing (e.g. 'vector<vector<int>> dp(10000, vector<int>(100000, 0))').`,
        "Calculate memory: 10,000 x 100,000 integers is 1,000,000,000 ints ≈ 4 GB of RAM!",
        "Reduce memory complexity: use O(N) or O(1) space instead of 2D/3D grids.",
        "Use 'std::unordered_map' or compress indices instead of allocating huge static tables."
      ]
    };
  }

  // 2. Division / Modulo by Zero
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

  // 3. Negative Index / Pointer Underflow
  if (isNegativeIndex) {
    return {
      type: "Negative Index / Underflow (UBSan)",
      happened: "You attempted to access a vector using a negative index (underflow).",
      where: location,
      details: "In C++, negative offsets (e.g. index -5) wrap into massive unsigned numbers (0xffffff...) causing illegal memory calculation.",
      nextSteps: [
        `Inspect Line ${lineNo}: an index was accessed with a negative value.`,
        "Check index calculations or two-pointer logic to ensure 'index >= 0' before accessing.",
        "Remember that C++ does NOT support Python-style negative indexing (like nums[-1])."
      ]
    };
  }

  // 4. Vector .at() Out of Range
  if (isOutOfRange) {
    const indexMatch = rawText.match(/which is (\d+)\)\s*>=\s*this->size\(\)\s*\(which is (\d+)\)/i);
    let rangeDetails = "std::out_of_range exception thrown by bounds-checked .at() call.";
    let stepMsg = `Inspect Line ${lineNo}: verify the index passed to '.at()'.`;
    if (indexMatch && indexMatch[1] && indexMatch[2]) {
      rangeDetails = `Attempted to access index ${indexMatch[1]}, but vector only has size ${indexMatch[2]} (valid indices: 0 to ${parseInt(indexMatch[2]) - 1}).`;
      stepMsg = `Inspect Line ${lineNo}: index ${indexMatch[1]} exceeds container size ${indexMatch[2]}.`;
    }

    return {
      type: "Index Out of Range (std::out_of_range)",
      happened: "You called '.at()' with an index that is outside the valid range of the vector.",
      where: location,
      details: rangeDetails,
      nextSteps: [
        stepMsg,
        "Remember: '.at(i)' throws an exception if i >= size(). Valid indices are strictly 0 to size-1.",
        "Check that you are not accessing an empty vector or past the last element."
      ]
    };
  }

  // 3. Division by Zero
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

  // 4. Out of Memory (bad_alloc)
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

  // 5. Empty vector binding
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

  // 6. Null pointer dereference
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

  // 7. Heap Buffer Overflow
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

  // 8. Heap Use After Free
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

  // 9. Stack Overflow
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
  const resultPane = document.querySelector('[data-layout-path="testcase.result"]') || document.body;

  let activeErrorText = "";
  const elements = resultPane.querySelectorAll("pre, code, div, span, h3, h4");
  for (const el of elements) {
    const text = el.innerText || "";
    if (
      (
        text.includes("Memory Limit Exceeded") ||
        text.includes("Time Limit Exceeded") ||
        text.includes("out_of_range") ||
        text.includes("_M_range_check") ||
        text.includes("stl_vector") ||
        text.includes("Sanitizer") ||
        text.includes("runtime error:") ||
        text.includes("division by zero") ||
        text.includes("bad_alloc") ||
        text.includes("SIGFPE")
      ) &&
      el.children.length < 5
    ) {
      activeErrorText = text;
      break;
    }
  }

  // If no error is on screen, cleanly remove the FAB and Drawer so it doesn't get stuck!
  if (!activeErrorText || activeErrorText.trim().length === 0) {
    if (document.getElementById("cpp-explainer-fab") || document.getElementById("cpp-explainer-drawer")) {
      removeExplainerUI();
      lastRenderedErrorText = "";
    }
    return;
  }

  const currentLine = getLiveLeetCodeLine(activeErrorText);
  const stateKey = `${currentLine}__${activeErrorText.trim().substring(0, 100)}`;

  if (stateKey !== lastRenderedErrorText) {
    lastRenderedErrorText = stateKey;
    const explanation = parseAndExplainSanitizer(activeErrorText);
    updateOrMountDrawer(explanation);
  }
}

setInterval(syncActiveErrorState, 600);
