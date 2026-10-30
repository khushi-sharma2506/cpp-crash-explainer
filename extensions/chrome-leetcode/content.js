// Client-side parser ported from cpp-crash-explainer Python package

function parseAndExplainASan(rawText) {
  const isHeapOverflow = /heap-buffer-overflow/i.test(rawText);
  const isUAF = /heap-use-after-free|use-after-free/i.test(rawText);
  const isStackOverflow = /stack-buffer-overflow/i.test(rawText);
  const isSEGV = /SEGV/i.test(rawText);
  const isLeak = /LeakSanitizer|memory leak/i.test(rawText);

  // Extract location
  const locMatch = rawText.match(/(?:in\s+([^\s:]+)\s+)?([^:\s]+):(\d+)/i);
  let location = "Not specified in report";
  if (locMatch) {
    location = `${locMatch[2]}:${locMatch[3]}`;
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
      happened: "Your code attempted to read or write memory outside the valid bounds of a std::vector or dynamically allocated heap array.",
      where: location,
      details: accessInfo || "An out-of-bounds access occurred past the allocated buffer bounds.",
      nextSteps: [
        "Check loop boundary conditions: did you write '<=' instead of '<'?",
        "If you are indexing 'dp[i]' or 'arr[n]', verify that the vector was allocated with size (n + 1).",
        "Make sure you did not access index 0 on an empty vector."
      ]
    };
  }

  if (isUAF) {
    return {
      type: "Heap use-after-free",
      happened: "Your code tried to read or write to an object or pointer that was already deleted or freed.",
      where: location,
      details: accessInfo || "Memory was accessed after deletion.",
      nextSteps: [
        "Check if you deleted a TreeNode or ListNode and later accessed its 'next' or 'val'.",
        "Avoid using raw pointers after delete; consider setting pointers to nullptr."
      ]
    };
  }

  if (isSEGV) {
    return {
      type: "Null Pointer Dereference (SEGV)",
      happened: "Your code attempted to access memory through a null pointer (nullptr) or uninitialized pointer.",
      where: location,
      details: "A segmentation fault occurred while accessing an invalid memory address (often 0x0).",
      nextSteps: [
        "Check if 'root', 'head', or a pointer variable is nullptr before accessing '->val' or '->next'.",
        "Add a guard check: 'if (!node) return ...;'"
      ]
    };
  }

  if (isStackOverflow) {
    return {
      type: "Stack buffer overflow",
      happened: "Your code wrote past the boundaries of a local fixed-size array on the stack.",
      where: location,
      details: accessInfo || "Memory access overflowed a local stack buffer.",
      nextSteps: [
        "Check fixed-size array indices (e.g. 'int arr[10]').",
        "Prefer using std::vector<int> instead of C-style raw stack arrays in competitive programming."
      ]
    };
  }

  return {
    type: "AddressSanitizer Crash",
    happened: "A memory corruption or invalid access was detected by AddressSanitizer.",
    where: location,
    details: rawText.substring(0, 150) + "...",
    nextSteps: [
      "Check array boundaries and loop indices.",
      "Ensure all pointers are initialized and not nullptr before dereference."
    ]
  };
}

// Observer to watch for LeetCode console error output
function attachExplainer() {
  const errorElements = document.querySelectorAll("pre, code, div");
  for (const el of errorElements) {
    if (el.innerText && el.innerText.includes("ERROR: AddressSanitizer") && !el.dataset.explainerAttached) {
      el.dataset.explainerAttached = "true";

      const explanation = parseAndExplainASan(el.innerText);

      const btn = document.createElement("button");
      btn.className = "cpp-explainer-btn";
      btn.innerText = "Explain Crash in Plain English";

      const card = document.createElement("div");
      card.className = "cpp-explainer-modal";
      card.style.display = "none";
      card.innerHTML = `
        <div class="cpp-explainer-header">C++ CRASH EXPLAINER (by cpp-crash-explainer)</div>
        <div class="cpp-explainer-section-title">ERROR TYPE:</div>
        <div class="cpp-explainer-section-content">${explanation.type}</div>
        <div class="cpp-explainer-section-title">WHAT HAPPENED:</div>
        <div class="cpp-explainer-section-content">${explanation.happened}</div>
        <div class="cpp-explainer-section-title">WHERE:</div>
        <div class="cpp-explainer-section-content">${explanation.where}</div>
        <div class="cpp-explainer-section-title">WHAT TO CHECK NEXT:</div>
        <ul style="margin: 4px 0 0 18px; padding: 0;">
          ${explanation.nextSteps.map(s => `<li>${s}</li>`).join("")}
        </ul>
      `;

      btn.addEventListener("click", () => {
        card.style.display = card.style.display === "none" ? "block" : "none";
      });

      el.parentNode.insertBefore(btn, el.nextSibling);
      el.parentNode.insertBefore(card, btn.nextSibling);
    }
  }
}

// Run observer periodically as users run code
setInterval(attachExplainer, 1500);
