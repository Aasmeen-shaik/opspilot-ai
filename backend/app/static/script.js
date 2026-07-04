const API_URL = "";

let meetings = [];
let selectedMeeting = null;

const sampleTranscript = `We agreed that staging GPU should stay off Monday to Friday because JC mainly tests on Saturday morning. We need to create a manual shutdown and startup runbook before automation. Michael wants the team to test the manual process first and validate pod recovery after the GPU node comes back online. There is a risk that GPU capacity may not be available after shutdown. The team should check node pool status, scale the GPU node pool, validate pods, and confirm application fallback messages. We should prepare a stakeholder update after the test is completed.`;

const pageTitles = {
  dashboard: "Dashboard",
  analysis: "New Analysis",
  board: "Execution Board",
  risks: "Risk Register",
  runbook: "Runbook",
  summary: "Stakeholder Summary",
  audit: "Audit Trail"
};

document.addEventListener("DOMContentLoaded", () => {
  const transcriptBox = document.getElementById("transcriptText");
  if (transcriptBox) {
    transcriptBox.value = sampleTranscript;
  }
    updateMicButtonState();

  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => {
      showView(button.dataset.view);
    });
  });

  loadMeetings();
});

function showView(viewName) {
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.remove("active");
  });

  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.remove("active");
  });

  const selectedView = document.getElementById(viewName);
  if (selectedView) {
    selectedView.classList.add("active");
  }

  const activeButton = document.querySelector(`[data-view="${viewName}"]`);
  if (activeButton) {
    activeButton.classList.add("active");
  }

  const pageTitle = document.getElementById("pageTitle");
  if (pageTitle) {
    pageTitle.innerText = pageTitles[viewName] || "Dashboard";
  }

  if (selectedMeeting) {
    renderSelectedMeeting();
  }
}

async function loadMeetings() {
  try {
    const response = await fetch(`${API_URL}/api/meetings`);
    meetings = await response.json();

    if (meetings.length > 0 && !selectedMeeting) {
      selectedMeeting = meetings[0];
    }

    renderDashboard();
    renderSelectedMeeting();
  } catch (error) {
    console.error("Unable to load meetings", error);
  }
}

async function analyzeMeeting() {
  const title = document.getElementById("meetingTitle").value.trim();
  const project = document.getElementById("projectName").value.trim();
  const transcript = document.getElementById("transcriptText").value.trim();

  if (!title || !project || !transcript) {
    alert("Please enter meeting title, project name, and transcript.");
    return;
  }

  const button = document.querySelector(".primary-btn.full");
  if (button) {
    button.innerText = "Generating...";
    button.disabled = true;
  }

  try {
    const response = await fetch(`${API_URL}/api/meetings/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title,
        project,
        transcript
      })
    });

    selectedMeeting = await response.json();

    await loadMeetings();
    showToast("Execution plan generated");
    showView("board");
  } catch (error) {
    console.error(error);
    alert("Something went wrong. Make sure FastAPI backend is running.");
  } finally {
    if (button) {
      button.innerText = "Generate Execution Plan";
      button.disabled = false;
    }
  }
}

async function updateTaskStatus(taskId, status) {
  if (!selectedMeeting) return;

  try {
    const response = await fetch(
      `${API_URL}/api/meetings/${selectedMeeting.id}/tasks/${taskId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status })
      }
    );

    selectedMeeting = await response.json();

    await loadMeetings();
    renderSelectedMeeting();
    showToast(`Task moved to ${status}`);
  } catch (error) {
    console.error(error);
    alert("Unable to update task status.");
  }
}

function renderDashboard() {
  const allTasks = meetings.flatMap((meeting) => meeting.tasks || []);
  const allRisks = meetings.flatMap((meeting) => meeting.risks || []);
  const totalDecisions = meetings.reduce(
    (total, meeting) => total + (meeting.decisions || []).length,
    0
  );

  setText("totalMeetings", meetings.length);
  setText("openTasks", allTasks.filter((task) => task.status !== "Done").length);
  setText("highRisks", allRisks.filter((risk) => risk.severity === "High").length);
  setText("totalDecisions", totalDecisions);

  setText("graphicDecisions", totalDecisions);
  setText("graphicTasks", allTasks.filter((task) => task.status !== "Done").length);
  setText("graphicRisks", allRisks.length);

  const latestSummary = document.getElementById("latestSummary");
  if (latestSummary) {
    latestSummary.innerText =
      selectedMeeting?.summary ||
      "No meeting analyzed yet. Create your first analysis.";
  }

  const recentMeetings = document.getElementById("recentMeetings");
  if (!recentMeetings) return;

  if (meetings.length === 0) {
    recentMeetings.innerHTML = `<div class="empty">No meetings yet. Create your first analysis.</div>`;
    return;
  }

  recentMeetings.innerHTML = meetings
    .slice(0, 5)
    .map(
      (meeting) => `
      <div class="recent-item" onclick="selectMeeting('${meeting.id}')">
        <strong>${escapeHtml(meeting.title)}</strong>
        <p>${escapeHtml(meeting.project)}</p>
        <p>${escapeHtml(meeting.created_at)}</p>
      </div>
    `
    )
    .join("");
}

function selectMeeting(meetingId) {
  selectedMeeting = meetings.find((meeting) => meeting.id === meetingId);
  renderDashboard();
  renderSelectedMeeting();
  showView("board");
}

function renderSelectedMeeting() {
  renderExecutionBoard();
  renderRisks();
  renderRunbook();
  renderSummary();
  renderAudit();
}

function renderExecutionBoard() {
  const taskBoard = document.getElementById("taskBoard");
  if (!taskBoard) return;

  if (!selectedMeeting) {
    taskBoard.innerHTML = `<div class="empty">No analysis selected.</div>`;
    return;
  }

  const statuses = ["To Do", "In Progress", "Done"];

  taskBoard.innerHTML = statuses
    .map((status) => {
      const tasks = selectedMeeting.tasks.filter((task) => task.status === status);

      return `
        <div class="kanban-column">
          <h4>${status}</h4>
          ${
            tasks.length === 0
              ? `<div class="empty">No tasks</div>`
              : tasks
                  .map(
                    (task) => `
                    <div class="task-card">
                      <div class="task-meta">
                        <span class="owner">${escapeHtml(task.owner)}</span>
                        <span class="badge ${task.priority.toLowerCase()}">${escapeHtml(task.priority)}</span>
                      </div>

                      <p>${escapeHtml(task.task)}</p>

                      <div class="task-actions">
                        <button onclick="updateTaskStatus('${task.id}', 'To Do')">To Do</button>
                        <button onclick="updateTaskStatus('${task.id}', 'In Progress')">In Progress</button>
                        <button onclick="updateTaskStatus('${task.id}', 'Done')">Done</button>
                      </div>
                    </div>
                  `
                  )
                  .join("")
          }
        </div>
      `;
    })
    .join("");
}

function renderRisks() {
  const riskList = document.getElementById("riskList");
  if (!riskList) return;

  if (!selectedMeeting) {
    riskList.innerHTML = `<div class="empty">No risks available.</div>`;
    return;
  }

  riskList.innerHTML = selectedMeeting.risks
    .map(
      (risk) => `
      <div class="risk-card">
        <div class="risk-top">
          <h3>Detected Risk</h3>
          <span class="badge ${risk.severity.toLowerCase()}">${escapeHtml(risk.severity)}</span>
        </div>

        <p>${escapeHtml(risk.risk)}</p>

        <div class="info-box">
          <strong>Impact</strong>
          <p>${escapeHtml(risk.impact)}</p>
        </div>

        <div class="info-box">
          <strong>Mitigation</strong>
          <p>${escapeHtml(risk.mitigation)}</p>
        </div>
      </div>
    `
    )
    .join("");
}

function renderRunbook() {
  const runbookList = document.getElementById("runbookList");
  if (!runbookList) return;

  if (!selectedMeeting) {
    runbookList.innerHTML = `<div class="empty">No runbook generated.</div>`;
    return;
  }

  runbookList.innerHTML = selectedMeeting.runbook_steps
    .map(
      (step, index) => `
      <div class="timeline-item">
        <div class="timeline-number">${index + 1}</div>
        <div class="timeline-content">
          <p>${escapeHtml(step.step)}</p>
        </div>
      </div>
    `
    )
    .join("");
}

function renderSummary() {
  if (!selectedMeeting) return;

  setText("technicalSummary", selectedMeeting.technical_summary);
  setText("businessSummary", selectedMeeting.business_summary);

  const decisionList = document.getElementById("decisionList");
  if (!decisionList) return;

  decisionList.innerHTML = selectedMeeting.decisions
    .map(
      (decision) => `
      <div class="decision-item">
        ${escapeHtml(decision.text)}
      </div>
    `
    )
    .join("");
}

function renderAudit() {
  const auditList = document.getElementById("auditList");
  if (!auditList) return;

  if (!selectedMeeting) {
    auditList.innerHTML = `<div class="empty">No audit history available.</div>`;
    return;
  }

  auditList.innerHTML = selectedMeeting.audit
    .map(
      (item) => `
      <div class="timeline-item">
        <div class="timeline-dot"></div>
        <div class="timeline-content">
          <p>${escapeHtml(item.event)}</p>
          <span>${escapeHtml(item.time)}</span>
        </div>
      </div>
    `
    )
    .join("");
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.innerText = value;
  }
}

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.innerText = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2200);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

window.showView = showView;
window.analyzeMeeting = analyzeMeeting;
window.updateTaskStatus = updateTaskStatus;
window.selectMeeting = selectMeeting;
// ===== LIVE MEETING CAPTURE =====

let recognition = null;
let micListening = false;
let micBaseTranscript = "";

function updateMicButtonState() {
  const micBtn = document.getElementById("micToggleBtn");
  if (!micBtn) return;

  if (micListening) {
    micBtn.classList.add("recording");
    micBtn.title = "Stop microphone";
    micBtn.setAttribute("aria-label", "Stop microphone");
  } else {
    micBtn.classList.remove("recording");
    micBtn.title = "Start microphone";
    micBtn.setAttribute("aria-label", "Start microphone");
  }
}

function toggleMic() {
  if (micListening) {
    stopMic();
  } else {
    startMic();
  }
}

function startMic() {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  const micStatus = document.getElementById("micStatus");
  const transcriptBox = document.getElementById("transcriptText");

  if (!SpeechRecognition) {
    micStatus.innerText =
      "Speech recognition is not supported in this browser. Please use Chrome or Edge.";
    micStatus.className = "stopped";
    return;
  }

  if (micListening) {
    return;
  }

  micBaseTranscript = transcriptBox.value.trim();

  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "en-US";

  recognition.onstart = () => {
    micListening = true;
    updateMicButtonState();
    micStatus.innerText = "Listening... Meeting audio is being captured.";
    micStatus.className = "listening";
    showToast("Mic started");
  };

  recognition.onresult = (event) => {
    let finalTranscript = "";
    let interimTranscript = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const text = event.results[i][0].transcript;

      if (event.results[i].isFinal) {
        finalTranscript += text + " ";
      } else {
        interimTranscript += text;
      }
    }

    if (finalTranscript.trim()) {
      micBaseTranscript = micBaseTranscript + " " + finalTranscript.trim();
    }

    transcriptBox.value =
      micBaseTranscript.trim() +
      (interimTranscript ? " " + interimTranscript : "");
  };

  recognition.onerror = (event) => {
    micStatus.innerText = `Mic error: ${event.error}`;
    micStatus.className = "stopped";
    micListening = false;
    updateMicButtonState();
  };

  recognition.onend = () => {
    if (micListening) {
      try {
        recognition.start();
      } catch (error) {
        console.log("Mic restart skipped", error);
      }
    } else {
      updateMicButtonState();
      micStatus.innerText = "Mic stopped. You can generate the execution plan now.";
      micStatus.className = "stopped";
    }
  };

  recognition.start();
}

function stopMic() {
  const micStatus = document.getElementById("micStatus");

  micListening = false;
  updateMicButtonState();

  if (recognition) {
    recognition.stop();
  }

  micStatus.innerText = "Mic stopped. You can generate the execution plan now.";
  micStatus.className = "stopped";

  showToast("Mic stopped");
}

function clearTranscript() {
  const transcriptBox = document.getElementById("transcriptText");
  const micStatus = document.getElementById("micStatus");

  transcriptBox.value = "";
  micBaseTranscript = "";

  micStatus.innerText = "Transcript cleared. Click the mic icon or paste notes.";
  micStatus.className = "stopped";

  updateMicButtonState();
  showToast("Transcript cleared");
}

window.startMic = startMic;
window.stopMic = stopMic;
window.clearTranscript = clearTranscript;
window.toggleMic = toggleMic;