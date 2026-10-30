// Anchor the explainer button directly next to "Runtime Error" header in the console

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

  if (isHeapOverflow) {
    return {
      type: "Heap Buffer Overflow",
      happened: "Your code attempted to read memory past the end of the 'nums' vector.",
      where: location,
      nextSteps: [
        "In this submission, index 999 is out-of-bounds because 'nums' only has a few elements.",
        "Check loop boundary conditions: verify whether '<=' should be '< nums.size()'.",
        "If initializing DP or lookup arrays, ensure size is at least (n + 1)."
      ]
    };
  }

  if (isUAF) {
    return {
      type: "Heap Use-After-Free",
      happened: "A TreeNode or ListNode pointer was accessed after being deleted.",
      where: location,
      nextSteps: [
        "Avoid accessing node->next or node->val after delete.",
        "Set pointers to nullptr immediately after calling delete."
      ]
    };
  }

  if (isSEGV) {
    return {
      type: "Null Pointer Dereference (SEGV)",
      happened: "Attempted to access ->val or ->next through a nullptr.",
      where: location,
      nextSteps: [
        "Add a guard check: 'if (!root) return ...;' before dereferencing pointers."
      ]
    };
  }

  return {
    type: "AddressSanitizer Crash",
    happened: "Memory safety violation detected by compiler sanitizer.",
    where: location,
    nextSteps: [
      "Check array bounds and pointer validity at the crash line."
    ]
  };
}

function attachExplainer() {
  if (document.getElementById("cpp-explainer-root")) {
    return;
  }

  // 1. Locate the red "Runtime Error" header inside LeetCode's result pane
  const headers = document.querySelectorAll("div, span, h4, p");
  let runtimeHeader = null;
  for (const h of headers) {
    if (h.innerText && h.innerText.trim() === "Runtime Error" && h.children.length === 0) {
      runtimeHeader = h;
      break;
    }
  }

  // 2. Also look for the error pre/div containing AddressSanitizer
  const allElements = document.querySelectorAll("div, pre, code");
  let errorText = "";
  for (const el of allElements) {
    if (el.innerText && el.innerText.includes("ERROR: AddressSanitizer") && el.children.length < 5) {
      errorText = el.innerText;
      break;
    }
  }

  if (errorText && runtimeHeader) {
    const explanation = parseAndExplainASan(errorText);

    const container = document.createElement("div");
    container.id = "cpp-explainer-root";
    container.className = "cpp-explainer-container";
    container.style.margin = "8px 0";

    const btn = document.createElement("button");
    btn.className = "cpp-explainer-btn";
    btn.type = "button";
    btn.style.cursor = "pointer";
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg> Explain Crash`;

    const card = document.createElement("div");
    card.className = "cpp-explainer-card";
    card.style.display = "none";
    card.innerHTML = `
      <div class="cpp-explainer-title-bar">
        <span>C++ Crash Explainer</span>
        <span class="cpp-explainer-badge">${explanation.type}</span>
      </div>
      <div class="cpp-explainer-row">
        <div class="cpp-explainer-label">Location</div>
        <div class="cpp-explainer-val"><code>${explanation.where}</code></div>
      </div>
      <div class="cpp-explainer-row">
        <div class="cpp-explainer-label">What Happened</div>
        <div class="cpp-explainer-val">${explanation.happened}</div>
      </div>
      <div class="cpp-explainer-row">
        <div class="cpp-explainer-label">What To Check Next</div>
        <ul class="cpp-explainer-list">
          ${explanation.nextSteps.map(s => `<li>${s}</li>`).join("")}
        </ul>
      </div>
    `;

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const isHidden = card.style.display === "none";
      card.style.display = isHidden ? "block" : "none";
      btn.innerHTML = isHidden 
        ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> Hide Explanation`
        : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg> Explain Crash`;
    });

    container.appendChild(btn);
    container.appendChild(card);

    // Place directly under "Runtime Error" header, right above the red text box!
    runtimeHeader.parentNode.insertBefore(container, runtimeHeader.nextSibling);
  }
}

// Poll DOM cleanly
setInterval(attachExplainer, 1000);
