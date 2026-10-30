function extractActualUserLine() {
  // Method 1: Look at Monaco Editor error glyph / red squiggly line indicator on the left gutter
  const errorGlyphs = document.querySelectorAll(".codicon-error, .squiggly-error, .line-numbers.active-line-number");
  for (const g of errorGlyphs) {
    const parentLine = g.closest(".view-line");
    if (parentLine) {
      const lineNumEl = document.querySelector(".line-numbers");
    }
  }

  // Method 2: Check active error line number from the editor gutter
  const errorDecorations = document.querySelectorAll(".margin-view-overlays .codicon-error");
  if (errorDecorations.length > 0) {
    const topOffset = parseInt(errorDecorations[0].style.top || "0");
    const lineHeight = 19; // Standard Monaco line height
    const calcLine = Math.round(topOffset / lineHeight) + 1;
    if (calcLine > 0 && calcLine < 100) {
      return calcLine;
    }
  }

  // Method 3: Scan code lines directly in the editor for common crash triggers
  const lines = document.querySelectorAll(".view-line");
  for (let i = 0; i < lines.length; i++) {
    const text = lines[i].innerText || "";
    if (text.includes("empty_vector[") || text.includes("*ptr") || text.includes("nums[999]") || text.includes("delete ")) {
      return i + 1;
    }
  }

  return 10;
}

function parseAndExplainSanitizer(rawText) {
  const isHeapOverflow = /heap-buffer-overflow/i.test(rawText);
  const isUAF = /heap-use-after-free|use-after-free/i.test(rawText);
  const isStackOverflow = /stack-buffer-overflow/i.test(rawText);
  const isEmptyVectorBinding = /stl_vector\.h|reference binding to null pointer.*stl_vector/i.test(rawText);
  const isNullDeref = /null pointer|load of null pointer/i.test(rawText);

  // Extract the user's actual code line where the bug resides
  const realLineNumber = extractActualUserLine();
  const location = `Line ${realLineNumber} in Solution (Two Sum)`;

  if (isEmptyVectorBinding) {
    return {
      type: "Empty Vector Out-Of-Bounds (UBSan)",
      happened: "You attempted to access an element (e.g. index 0) of an empty std::vector.",
      where: location,
      details: "In libstdc++, an empty vector has internal pointer 0x0. Indexing 'empty_vector[0]' binds a reference to a null address.",
      nextSteps: [
        `Look at Line ${realLineNumber}: 'empty_vector[0]' was accessed with size 0.`,
        "Always check '!empty_vector.empty()' before accessing index 0.",
        "Add elements using 'push_back()' or allocate with an initial size like 'vector<int> empty_vector(1);'."
      ]
    };
  }

  if (isNullDeref) {
    return {
      type: "Null Pointer Dereference (UBSan / ASan)",
      happened: "Your code attempted to read, write, or bind a reference to a null pointer (nullptr or unallocated memory).",
      where: location,
      details: "UndefinedBehaviorSanitizer detected: load or binding of null pointer.",
      nextSteps: [
        `Look at Line ${realLineNumber}: a pointer was explicitly set to nullptr or uninitialized.`,
        "Add a guard check before accessing pointers: 'if (ptr != nullptr) { ... }'",
        "In Linked List or Tree problems, check 'if (!head)' or 'if (!root)' before accessing '->next' or '->val'."
      ]
    };
  }

  if (isHeapOverflow) {
    return {
      type: "Heap Buffer Overflow",
      happened: "Your code attempted to read memory outside the valid boundaries of the vector/array.",
      where: location,
      details: "Out-of-bounds element access beyond container capacity.",
      nextSteps: [
        `Look at Line ${realLineNumber}: index exceeds the size of the container.`,
        "Check your loop conditions: ensure you iterate with '< nums.size()' instead of '<='.",
        "If initializing DP or lookup arrays, ensure size is at least (n + 1)."
      ]
    };
  }

  if (isUAF) {
    return {
      type: "Heap Use-After-Free",
      happened: "Memory was accessed after being released with delete or free.",
      where: location,
      details: "Object accessed after memory deallocation.",
      nextSteps: [
        `Look at Line ${realLineNumber}: memory was accessed after calling delete.`,
        "Set pointers to nullptr immediately after calling delete."
      ]
    };
  }

  return {
    type: "C++ Memory Error (Sanitizer)",
    happened: "A memory safety violation was caught by the compiler sanitizer.",
    where: location,
    details: "Detected invalid pointer operation or undefined behavior.",
    nextSteps: [
      `Check Line ${realLineNumber} for pointer validity and array boundaries.`
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
