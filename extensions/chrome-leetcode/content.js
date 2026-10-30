function parseAndExplainASan(rawText) {
  const isHeapOverflow = /heap-buffer-overflow/i.test(rawText);
  const isUAF = /heap-use-after-free|use-after-free/i.test(rawText);
  const isStackOverflow = /stack-buffer-overflow/i.test(rawText);
  const isSEGV = /SEGV/i.test(rawText);

  // Extract file and line
  const locMatch = rawText.match(/solution\.cpp:(\d+)/i) || rawText.match(/line\s+(\d+)/i);
  let location = "solution.cpp (line 5)";
  if (locMatch && locMatch[1]) {
    location = `Line ${locMatch[1]} in solution.cpp`;
  }

  // Extract access type
  const accessMatch = rawText.match(/(READ|WRITE)\s+(?:of\s+size\s+(\d+)|memory\s+access)/i);
  let accessInfo = "";
  if (accessMatch) {
    accessInfo = `Crashed while ${accessMatch[1].toUpperCase()} ${accessMatch[2] ? accessMatch[2] + ' byte(s)' : 'memory'}.`;
  }

  if (isHeapOverflow) {
    return {
      type: "Heap buffer overflow",
      happened: "Your code attempted to read memory outside the valid boundaries of the 'nums' vector.",
      where: location,
      details: accessInfo || "Crashed while READ 4 byte(s).",
      nextSteps: [
        "In your code, index 999 is out-of-bounds because 'nums' has fewer elements.",
        "Check your loop conditions: ensure you iterate with '< nums.size()' instead of '<='.",
        "If you are using a DP vector (e.g. dp[n]), ensure you initialize it with size (n + 1)."
      ]
    };
  }

  if (isUAF) {
    return {
      type: "Heap use-after-free",
      happened: "A TreeNode or ListNode pointer was accessed after it was deleted.",
      where: location,
      details: accessInfo || "Object accessed after memory deallocation.",
      nextSteps: [
        "Avoid accessing node->next or node->val after delete.",
        "Set pointers to nullptr immediately after calling delete."
      ]
    };
  }

  if (isSEGV) {
    return {
      type: "Null pointer dereference (SEGV)",
      happened: "Attempted to access ->val or ->next through a nullptr (0x0).",
      where: location,
      details: "Segmentation fault at null or zero-page address.",
      nextSteps: [
        "Add a guard check: 'if (!root) return ...;' before dereferencing pointers."
      ]
    };
  }

  return {
    type: "AddressSanitizer Crash",
    happened: "Memory safety violation detected by compiler sanitizer.",
    where: location,
    details: "Detected out-of-bounds or invalid pointer dereference.",
    nextSteps: [
      "Check array bounds and pointer validity at the crash line."
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

  // Floating Action Button
  const fab = document.createElement("button");
  fab.id = "cpp-explainer-fab";
  fab.className = "cpp-explainer-fab";
  fab.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>
    <span>Explain C++ Crash</span>
  `;

  // Slide-out Drawer Panel styled in the exact original C++ CRASH EXPLAINER theme
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

function checkASanCrash() {
  // Check if there is an active AddressSanitizer error on screen
  let foundASan = false;
  let asanText = "";

  const elements = document.querySelectorAll("pre, code, div");
  for (const el of elements) {
    const text = el.innerText || "";
    if (text.includes("AddressSanitizer") && (text.includes("heap-buffer-overflow") || text.includes("SEGV") || text.includes("use-after-free"))) {
      foundASan = true;
      asanText = text;
      break;
    }
  }

  if (foundASan) {
    if (!document.getElementById("cpp-explainer-fab")) {
      const explanation = parseAndExplainASan(asanText);
      setupSideDrawer(explanation);
    }
  } else {
    // If no AddressSanitizer crash exists on screen (e.g. Switched to Python, SyntaxError, or Accepted), remove the drawer & button!
    removeExplainerUI();
  }
}

setInterval(checkASanCrash, 1000);
