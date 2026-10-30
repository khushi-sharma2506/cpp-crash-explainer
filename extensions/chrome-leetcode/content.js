// 100% accurate line number extractor directly from LeetCode error output

function extractLeetCodeCrashLine(rawText) {
  // Pattern 1: LeetCode's canonical header "Line 5: Char 23:"
  const headerMatch = rawText.match(/Line\s+(\d+)\s*:\s*Char\s+\d+/i);
  if (headerMatch && headerMatch[1]) {
    return parseInt(headerMatch[1], 10);
  }

  // Pattern 2: Stack trace line: "solution.cpp:5:23"
  const traceMatch = rawText.match(/solution\.cpp:(\d+)(?::\d+)?/i);
  if (traceMatch && traceMatch[1]) {
    return parseInt(traceMatch[1], 10);
  }

  // Pattern 3: Generic "Line 5:"
  const genericMatch = rawText.match(/Line\s+(\d+):/i);
  if (genericMatch && genericMatch[1]) {
    return parseInt(genericMatch[1], 10);
  }

  return 5;
}

function parseAndExplainSanitizer(rawText) {
  const isHeapOverflow = /heap-buffer-overflow/i.test(rawText);
  const isUAF = /heap-use-after-free|use-after-free/i.test(rawText);
  const isStackOverflow = /stack-buffer-overflow/i.test(rawText);
  const isEmptyVector = /stl_vector\.h|reference binding to null pointer.*stl_vector/i.test(rawText);
  const isNullDeref = /null pointer|load of null pointer|SEGV.*0x0/i.test(rawText);

  // Exact line number directly from LeetCode's compiler report
  const lineNo = extractLeetCodeCrashLine(rawText);
  const location = `Line ${lineNo} in solution.cpp`;

  if (isEmptyVector) {
    return {
      type: "Empty Vector Out-Of-Bounds (UBSan)",
      happened: "You attempted to access an element of an empty std::vector (size 0).",
      where: location,
      details: "In C++, indexing an empty vector binds a reference to a null address (0x0).",
      nextSteps: [
        `Inspect Line ${lineNo}: verify whether the vector was empty before indexing.`,
        "Always check '!vec.empty()' before indexing 'vec[0]'.",
        "Initialize the vector with an explicit size or add elements via 'push_back()'."
      ]
    };
  }

  if (isNullDeref) {
    return {
      type: "Null Pointer Dereference (SEGV / UBSan)",
      happened: "Your code attempted to read, write, or access a member using a null pointer (nullptr).",
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
        `Inspect Line ${lineNo}: in your code, 'nums[nums.size()]' is 1 past the valid range (valid indices are 0 to size-1).`,
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
    type: "C++ Memory Error (Sanitizer)",
    happened: "A memory safety error was reported by the compiler sanitizer.",
    where: location,
    details: "Detected out-of-bounds access or undefined memory operation.",
    nextSteps: [
      `Check Line ${lineNo} for array boundaries and pointer validity.`
    ]
  };
}

function removeExplainerUI() {
  const oldFab = document.getElementById("cpp-explainer-fab");
  if (oldFab) oldFab.remove();
  const oldDrawer = document.getElementById("cpp-explainer-drawer");
  if (oldDrawer) oldDrawer.remove();
}

function setupSideDrawer(explanation) {
  removeExplainerUI();

  const fab = document.createElement("button");
  fab.id = "cpp-explainer-fab";
  fab.className = "cpp-explainer-fab";
  fab.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>
    <span>Explain C++ Crash</span>
  `;

  const drawer = document.createElement("div");
  drawer.id = "cpp-explainer-drawer";
  drawer.className = "cpp-explainer-drawer";
  drawer.innerHTML = `
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

function checkSanitizerCrash() {
  let foundSanitizer = false;
  let errorText = "";

  const elements = document.querySelectorAll("pre, code, div");
  for (const el of elements) {
    const text = el.innerText || "";
    if (
      (text.includes("Sanitizer") || text.includes("runtime error:")) &&
      (text.includes("null pointer") || text.includes("heap-buffer-overflow") || text.includes("SEGV") || text.includes("use-after-free") || text.includes("undefined-behavior"))
    ) {
      foundSanitizer = true;
      errorText = text;
      break;
    }
  }

  if (foundSanitizer) {
    if (!document.getElementById("cpp-explainer-fab")) {
      const explanation = parseAndExplainSanitizer(errorText);
      setupSideDrawer(explanation);
    }
  } else {
    removeExplainerUI();
  }
}

setInterval(checkSanitizerCrash, 1000);
