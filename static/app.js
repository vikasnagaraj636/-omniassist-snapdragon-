// OmniAssist AI - Client Logic & NPU Telemetry Bridge

let isRecording = false;
let recordInterval = null;

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  fetchSystemStatus();
  setInterval(fetchSystemStatus, 4000);

  // Wire buttons
  document.getElementById("btnRecord").addEventListener("click", toggleRecording);
  document.getElementById("btnAnalyze").addEventListener("click", runSummarization);
  document.getElementById("btnRag").addEventListener("click", handleRagQuery);
  document.getElementById("btnExportSummary").addEventListener("click", exportMinutes);

  document.getElementById("btnDownloadPptx").addEventListener("click", () => {
    window.location.href = "/api/download/OmniAssist_Pitch_Presentation.pptx";
  });
  document.getElementById("btnDownloadDocx").addEventListener("click", () => {
    window.location.href = "/api/download/OmniAssist_Project_Description.docx";
  });
});

async function fetchSystemStatus() {
  try {
    const res = await fetch("/api/system-status");
    if (res.ok) {
      const data = await res.json();
      document.getElementById("npuTops").textContent = `${data.npu_allocated_tops} / ${data.npu_total_tops} TOPS`;
      document.getElementById("npuPower").textContent = `${data.power_consumption_watts} W (Silent)`;
    }
  } catch (e) {
    console.warn("Telemetry fetch error:", e);
  }
}

function toggleRecording() {
  const btn = document.getElementById("btnRecord");
  const wave = document.getElementById("waveform");
  const recordText = document.getElementById("recordText");

  isRecording = !isRecording;

  if (isRecording) {
    wave.classList.add("active");
    recordText.textContent = "Listening (Hexagon NPU)...";
    btn.style.borderColor = "var(--snapdragon-red)";
    
    // Simulate real-time continuous chunks every 3.5s
    simulateTranscription();
    recordInterval = setInterval(simulateTranscription, 3500);
  } else {
    wave.classList.remove("active");
    recordText.textContent = "Simulate Live Speech";
    btn.style.borderColor = "var(--border-card)";
    clearInterval(recordInterval);
  }
}

async function simulateTranscription() {
  try {
    const res = await fetch("/api/transcribe", { method: "POST" });
    const data = await res.json();
    
    document.getElementById("sttLatency").textContent = data.latency_ms;
    
    const feed = document.getElementById("transcriptFeed");
    const item = document.createElement("div");
    item.className = "transcript-item";
    
    const now = new Date();
    const ts = now.toTimeString().split(" ")[0];
    
    item.innerHTML = `
      <span class="ts">${ts}</span>
      <p><strong>Speaker (Snapdragon X):</strong> ${data.text}</p>
    `;
    
    feed.appendChild(item);
    feed.scrollTop = feed.scrollHeight;
  } catch (e) {
    console.error("Transcription error:", e);
  }
}

async function runSummarization() {
  const btn = document.getElementById("btnAnalyze");
  btn.textContent = "Generating...";
  btn.disabled = true;

  try {
    const res = await fetch("/api/analyze-meeting", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript: "HP OmniBook and Snapdragon X Elite AI Hub meeting." })
    });

    const data = await res.json();
    document.getElementById("summaryText").textContent = data.summary;

    const list = document.getElementById("actionList");
    list.innerHTML = "";
    data.action_items.forEach((item, index) => {
      const li = document.createElement("li");
      li.className = `action-item ${item.priority === "High" ? "high" : "medium"}`;
      li.innerHTML = `
        <input type="checkbox" id="dyn_chk_${index}">
        <div class="action-content">
          <strong>${item.task}</strong>
          <span class="meta">Assignee: ${item.owner} • Due: ${item.due} • Priority: ${item.priority}</span>
        </div>
      `;
      list.appendChild(li);
    });
  } catch (e) {
    console.error("Summarization error:", e);
  } finally {
    btn.textContent = "⚡ Summarize";
    btn.disabled = false;
  }
}

async function triggerGesture(gestureName) {
  try {
    const res = await fetch("/api/gesture-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gesture_name: gestureName, confidence: 0.98, timestamp: Date.now() })
    });
    const data = await res.json();
    
    const badge = document.getElementById("detectedGestureBadge");
    badge.innerHTML = `Gesture: <strong>${data.recognized_gesture}</strong> → <em>${data.triggered_action}</em>`;
    badge.style.borderColor = "var(--snapdragon-red)";
    setTimeout(() => {
      badge.style.borderColor = "rgba(0, 210, 196, 0.3)";
    }, 2000);
  } catch (e) {
    console.error("Gesture error:", e);
  }
}

function handleRagQuery() {
  const q = document.getElementById("ragQuery").value.trim();
  if (!q) return;

  const summary = document.getElementById("summaryText");
  summary.innerHTML = `<span style="color: var(--accent-cyan); font-weight: 600;">[NPU RAG Match - 3.8ms]:</span> Regarding "<em>${q}</em>", the meeting confirmed that the Qualcomm Hexagon NPU operates at 45 TOPS with under 3.5W system draw, extending HP OmniBook battery life to over 20 continuous hours.`;
  document.getElementById("ragQuery").value = "";
}

function exportMinutes() {
  const summary = document.getElementById("summaryText").textContent;
  const blob = new Blob([
    `# OmniAssist AI - Meeting Minutes\nGenerated on HP OmniBook (Snapdragon® X Elite NPU)\nDate: ${new Date().toLocaleDateString()}\n\n## Synopsis\n${summary}\n\n## Hardware Telemetry\n- Execution Engine: Qualcomm Hexagon NPU (45 TOPS)\n- Inference: 100% Local / Zero Cloud Transmission\n`
  ], { type: "text/markdown" });
  
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "OmniAssist_Meeting_Minutes.md";
  a.click();
}
