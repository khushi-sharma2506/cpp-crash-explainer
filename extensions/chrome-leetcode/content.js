// Clean, single-injection parser ported from cpp-crash-explainer

function parseAndExplainASan(rawText) {
  const isHeapOverflow = /heap-buffer-overflow/i.test(rawText);
  const isUAF = /heap-use-after-free|use-after-free/i.test(rawText);
  const isStackOverflow = /stack-buffer-overflow/i.test(rawText);
  const isSEGV = /SEGV/i.test(rawText);

  // Extract file and line
  const locMatch = rawText.match(/(?:in\s+([^\s:]+)\s+)?([^:\s]+\.(?:cpp|c|h|hpp)):(\d+)/i) || rawText.match(/line\s+(\d+)/i);
  let location = "solution.cpp:5";
  if (locMatch && locMatch[2] && locMatch[3]) {
    location = `${locMatch[2]}:${locMatch[3]}`;
  } else if (locMatch && locMatch[1]) {
    location = `line ${locMatch[1]}`;
  }

  // Extract access type
  const accessMatch = rawText.match(/(READ|WRITE)\s+(?:of\s+size\s+(\d+)|memory\s+access)/i);
  let accessInfo = "";
  if (accessMatch) {
    accessInfo = `Crashed while ${accessMatch[1].toUpperCase()} of ${accessMatch[2] ? accessMatch[2] + ' byte(s)' : 'memory'}.`;
  }

  if (isHeapOverflow) {
    return {
      type: "Heap buffer overflow",
      happened: "Memory access exceeded the allocated boundaries of a vector or dynamic heap buffer.",
      where: location,
      details: accessInfo || "Out-of-bounds access past allocated buffer capacity.",
      nextSteps: [
        "Check loop boundary conditions: verify whether '<=' should be '<'.",
        "If indexing 'nums[i]' or 'dp[n]', ensure the size covers that index.",
        "Ensure you are not indexing an empty vector."
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
    type: "AddressSanitizer Memory Error",
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
  // Only search inside the test result panel to avoid multiple insertions
  const testResultPane = document.querySelector('[data-layout-path="testcase.result"]') || document.querySelector('.test-result-wrapper') || document.body;

  const elements = testResultPane.querySelectorAll("pre, code");
  for (const el of elements) {
    const text = el.innerText || "";
    if (text.includes("AddressSanitizer") && !el.closest(".cpp-explainer-container")) {
      // Check if already injected for this pre block
      if (el.nextElementSibling && el.nextElementSibling.classList.contains("cpp-explainer-container")) {
        continue;
      }

      const explanation = parseAndExplainASan(text);

      const container = document.createElement("div");
      container.className = "cpp-explainer-container";

      const btn = document.createElement("button");
      btn.className = "cpp-explainer-btn";
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg> Explain Crash`;

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
          <div class="cpp-explainer-label">Recommended Inspection</div>
          <ul class="cpp-explainer-list">
            ${explanation.nextSteps.map(s => `<li>${s}</li>`).join("")}
          </ul>
        </div>
      `;

      btn.addEventListener("click", () => {
        const isHidden = card.style.display === "none";
        card.style.display = isHidden ? "block" : "none";
        btn.innerHTML = isHidden 
          ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> Hide Diagnosis`
          : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg> Explain Crash`;
      });

      container.appendChild(btn);
      container.appendChild(card);
      el.parentNode.insertBefore(container, el.nextSibling);
      break; // Only attach once to the exact error
    }
  }
}

// Run observer safely
setInterval(attachExplainer, 2000);
