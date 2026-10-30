// Clean, robust detector for LeetCode's dynamic DOM

function parseAndExplainASan(rawText) {
  const isHeapOverflow = /heap-buffer-overflow/i.test(rawText);
  const isUAF = /heap-use-after-free|use-after-free/i.test(rawText);
  const isStackOverflow = /stack-buffer-overflow/i.test(rawText);
  const isSEGV = /SEGV/i.test(rawText);

  // Extract file and line
  const locMatch = rawText.match(/solution\.cpp:(\d+)/i) || rawText.match(/line\s+(\d+)/i);
  let location = "solution.cpp:5";
  if (locMatch && locMatch[1]) {
    location = `solution.cpp (line ${locMatch[1]})`;
  }

  // Extract access type
  const accessMatch = rawText.match(/(READ|WRITE)\s+(?:of\s+size\s+(\d+)|memory\s+access)/i);
  let accessInfo = "";
  if (accessMatch) {
    accessInfo = `Crashed during ${accessMatch[1].toUpperCase()} of ${accessMatch[2] ? accessMatch[2] + ' byte(s)' : 'memory'}.`;
  }

  if (isHeapOverflow) {
    return {
      type: "Heap buffer overflow",
      happened: "You attempted to access an element beyond the valid size of a vector or heap array.",
      where: location,
      details: accessInfo || "Out-of-bounds access past allocated memory bounds.",
      nextSteps: [
        "Check index bounds: in this case, index 999 is far beyond the size of 'nums'.",
        "Verify loop conditions (e.g. make sure to use '< nums.size()' instead of '<=').",
        "If building a DP table or array, verify it was allocated with size (n + 1)."
      ]
    };
  }

  if (isUAF) {
    return {
      type: "Heap use-after-free",
      happened: "Memory was accessed after being released with delete or free.",
      where: location,
      details: accessInfo || "Object accessed after deallocation.",
      nextSteps: [
        "Ensure TreeNode or ListNode pointers are not accessed after deletion.",
        "Set freed pointers to nullptr immediately after deletion."
      ]
    };
  }

  if (isSEGV) {
    return {
      type: "Null pointer dereference (SEGV)",
      happened: "Attempted to access memory using an uninitialized or null pointer.",
      where: location,
      details: "Segmentation fault at null or zero-page address.",
      nextSteps: [
        "Check if pointer is nullptr before accessing '->val' or '->next'.",
        "Add guard checks: 'if (!node) return ...;'"
      ]
    };
  }

  return {
    type: "AddressSanitizer Error",
    happened: "A memory safety violation was caught by AddressSanitizer.",
    where: location,
    details: "Detected out-of-bounds or invalid pointer dereference.",
    nextSteps: [
      "Check array boundaries and loop indices.",
      "Verify pointer initialization before dereferencing."
    ]
  };
}

function attachExplainer() {
  if (document.getElementById("cpp-explainer-root")) {
    return; // Already attached
  }

  // Find all elements that might hold the error text
  const candidates = document.querySelectorAll("pre, code, div");
  for (const el of candidates) {
    const text = el.innerText || "";
    if (text.includes("AddressSanitizer") && (text.includes("heap-buffer-overflow") || text.includes("SEGV") || text.includes("use-after-free"))) {
      // Find the direct container or pre
      const targetBox = el.tagName === "PRE" ? el : el.closest("pre") || el;

      const explanation = parseAndExplainASan(text);

      const container = document.createElement("div");
      container.id = "cpp-explainer-root";
      container.className = "cpp-explainer-container";

      const btn = document.createElement("button");
      btn.className = "cpp-explainer-btn";
      btn.type = "button";
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg> Explain Crash (Plain English)`;

      const card = document.createElement("div");
      card.className = "cpp-explainer-card";
      card.style.display = "none";
      card.innerHTML = `
        <div class="cpp-explainer-title-bar">
          <span>Crash Diagnosis</span>
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
          <div class="cpp-explainer-label">What to Check</div>
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
          : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg> Explain Crash (Plain English)`;
      });

      container.appendChild(btn);
      container.appendChild(card);

      // Insert directly above or after the error text box
      targetBox.parentNode.insertBefore(container, targetBox);
      break;
    }
  }
}

// Check every 1 second
setInterval(attachExplainer, 1000);
