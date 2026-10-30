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
      type: "Heap Buffer Overflow",
      happened: "Your code attempted to read memory outside the valid boundaries of the 'nums' vector.",
      where: location,
      details: accessInfo || "Memory access occurred past the allocated vector size.",
      nextSteps: [
        "In your code, index 999 is out-of-bounds because 'nums' has fewer elements.",
        "Check your loop conditions: ensure you iterate with '< nums.size()' instead of '<='.",
        "If you are using a DP vector (e.g. dp[n]), ensure you initialize it with size (n + 1)."
      ]
    };
  }

  if (isUAF) {
    return {
      type: "Heap Use-After-Free",
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
      type: "Null Pointer Dereference (SEGV)",
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

let activeDrawer = null;

function setupSideDrawer(explanation) {
  // Remove existing if any
  const oldFab = document.getElementById("cpp-explainer-fab");
  if (oldFab) oldFab.remove();
  const oldDrawer = document.getElementById("cpp-explainer-drawer");
  if (oldDrawer) oldDrawer.remove();

  // Floating Action Button
  const fab = document.createElement("button");
  fab.id = "cpp-explainer-fab";
  fab.className = "cpp-explainer-fab";
  fab.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>
    <span>Explain C++ Crash</span>
  `;

  // Slide-out Drawer Panel
  const drawer = document.createElement("div");
  drawer.id = "cpp-explainer-drawer";
  drawer.className = "cpp-explainer-drawer";
  drawer.innerHTML = `
    <div class="cpp-drawer-header">
      <div class="cpp-drawer-title">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>
        <span>C++ Crash Explainer</span>
      </div>
      <button id="cpp-drawer-close" class="cpp-drawer-close">✕</button>
    </div>
    <div class="cpp-drawer-body">
      <div class="cpp-drawer-badge">${explanation.type}</div>

      <div class="cpp-drawer-section">
        <div class="cpp-drawer-section-title">Where the Crash Occurred</div>
        <div class="cpp-drawer-section-content"><code>${explanation.where}</code></div>
      </div>

      <div class="cpp-drawer-section">
        <div class="cpp-drawer-section-title">What Happened</div>
        <div class="cpp-drawer-section-content">${explanation.happened}</div>
      </div>

      <div class="cpp-drawer-section">
        <div class="cpp-drawer-section-title">What The Report Tells Us</div>
        <div class="cpp-drawer-section-content">${explanation.details}</div>
      </div>

      <div class="cpp-drawer-section">
        <div class="cpp-drawer-section-title">What To Check In Your Code</div>
        <ul class="cpp-drawer-steps">
          ${explanation.nextSteps.map(s => `<li>${s}</li>`).join("")}
        </ul>
      </div>
    </div>
  `;

  document.body.appendChild(fab);
  document.body.appendChild(drawer);

  fab.addEventListener("click", () => {
    drawer.classList.add("open");
  });

  drawer.querySelector("#cpp-drawer-close").addEventListener("click", () => {
    drawer.classList.remove("open");
  });
}

function checkASanCrash() {
  const elements = document.querySelectorAll("pre, code, div");
  for (const el of elements) {
    const text = el.innerText || "";
    if (text.includes("AddressSanitizer") && (text.includes("heap-buffer-overflow") || text.includes("SEGV") || text.includes("use-after-free"))) {
      if (!document.getElementById("cpp-explainer-fab")) {
        const explanation = parseAndExplainASan(text);
        setupSideDrawer(explanation);
      }
      break;
    }
  }
}

setInterval(checkASanCrash, 1000);
