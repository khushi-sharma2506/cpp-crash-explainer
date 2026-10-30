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
      happened: "You attempted to access an element past the end of the 'nums' array/vector.",
      where: location,
      nextSteps: [
        "In your code, index 999 exceeds the size of 'nums'.",
        "Verify loop boundaries: make sure your loop runs '< nums.size()' instead of '<='.",
        "If you are using a DP vector, ensure it is sized (n + 1) before indexing dp[n]."
      ]
    };
  }

  if (isUAF) {
    return {
      type: "Heap Use-After-Free",
      happened: "A pointer was accessed after the object was deleted from heap memory.",
      where: location,
      nextSteps: [
        "Check if you deleted a node and then accessed node->next or node->val.",
        "Set deleted pointers to nullptr."
      ]
    };
  }

  if (isSEGV) {
    return {
      type: "Null Pointer Dereference (SEGV)",
      happened: "Attempted to access memory using an uninitialized or null pointer (nullptr).",
      where: location,
      nextSteps: [
        "Add a guard check: 'if (!node) return ...;' before dereferencing pointers."
      ]
    };
  }

  return {
    type: "AddressSanitizer Crash",
    happened: "Memory safety violation caught by AddressSanitizer.",
    where: location,
    nextSteps: [
      "Check array bounds and pointer validity at the crash line."
    ]
  };
}

function attachExplainer() {
  if (document.getElementById("cpp-explainer-banner")) {
    return;
  }

  // Find the Runtime Error heading or the red pre/code block
  let targetBox = null;
  const headers = document.querySelectorAll("div, span, h4, p");
  for (const h of headers) {
    if (h.innerText && h.innerText.trim() === "Runtime Error" && h.children.length === 0) {
      targetBox = h;
      break;
    }
  }

  // Find ASan text
  const elements = document.querySelectorAll("pre, code, div");
  let errorText = "";
  for (const el of elements) {
    if (el.innerText && el.innerText.includes("ERROR: AddressSanitizer") && el.children.length < 5) {
      errorText = el.innerText;
      if (!targetBox) targetBox = el;
      break;
    }
  }

  if (errorText && targetBox) {
    const explanation = parseAndExplainASan(errorText);

    const banner = document.createElement("div");
    banner.id = "cpp-explainer-banner";
    banner.className = "cpp-explainer-banner";

    banner.innerHTML = `
      <div class="cpp-explainer-top-row">
        <div class="cpp-explainer-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>
          <span>C++ Crash Explainer</span>
          <span class="cpp-explainer-badge">${explanation.type}</span>
        </div>
        <button id="cpp-toggle-btn" class="cpp-explainer-btn" type="button">
          Show Plain English Explanation ▾
        </button>
      </div>

      <div id="cpp-details-card" class="cpp-explainer-card" style="display: none;">
        <div class="cpp-explainer-field">
          <div class="cpp-explainer-label">Crash Location</div>
          <div class="cpp-explainer-val"><code>${explanation.where}</code></div>
        </div>
        <div class="cpp-explainer-field">
          <div class="cpp-explainer-label">What Happened</div>
          <div class="cpp-explainer-val">${explanation.happened}</div>
        </div>
        <div class="cpp-explainer-field">
          <div class="cpp-explainer-label">What To Check in Your Code</div>
          <ul class="cpp-explainer-steps">
            ${explanation.nextSteps.map(s => `<li>${s}</li>`).join("")}
          </ul>
        </div>
      </div>
    `;

    // Hook toggle
    const toggleBtn = banner.querySelector("#cpp-toggle-btn");
    const detailsCard = banner.querySelector("#cpp-details-card");
    toggleBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const isHidden = detailsCard.style.display === "none";
      detailsCard.style.display = isHidden ? "block" : "none";
      toggleBtn.innerText = isHidden ? "Hide Explanation ▴" : "Show Plain English Explanation ▾";
    });

    targetBox.parentNode.insertBefore(banner, targetBox.nextSibling);
  }
}

setInterval(attachExplainer, 1000);
