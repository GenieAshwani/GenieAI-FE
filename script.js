function connectWebSocket() {
  // Determine the correct WebSocket URL dynamically
  const API_BASE_URL = process.env.REACT_APP_API_URL || window.location.origin;

  // Ensure correct WebSocket protocol (`ws://` for HTTP, `wss://` for HTTPS)
  const WS_BASE_URL = API_BASE_URL.replace(/^http/, "ws");

  const socket = new WebSocket(`${WS_BASE_URL}/chat`);

  socket.onopen = function () {
    console.log("✅ Connected to WebSocket:", `${WS_BASE_URL}/chat`);
  };

  socket.onmessage = function (event) {
    console.log("🔹 Received WebSocket Message: ", event.data);

    try {
      let data = JSON.parse(event.data);

      // ✅ Remove the loading animation when AI response is received
      let loadingDiv = document.getElementById("loading-message");
      if (loadingDiv) {
        loadingDiv.remove();
      }

      // ✅ Check if this is Sentiment Data
      if (
        data.Positive !== undefined &&
        data.Negative !== undefined &&
        data.Neutral !== undefined
      ) {
        console.log("✅ Sentiment Report Detected!", data);
        displayMessage("✅ Sentiment Report Generated.", "bot-message");
        showSentimentChart(data);
        return;
      }

      // ✅ Check if response contains plans
      if (data.plans && Array.isArray(data.plans) && data.plans.length > 0) {
        console.log("✅ Plans Data Received:", data.plans);
        displayMessage(JSON.stringify({ plans: data.plans }), "bot-message");
        return;
      }

      // ✅ Otherwise, handle as normal AI response
      let aiResponse = data.candidates
        ? data.candidates[0].content.parts[0].text
        : event.data;
      displayMessage(aiResponse, "bot-message");

      // ✅ Save AI response in chat history
      if (chatSessions[currentChatIndex]) {
        chatSessions[currentChatIndex].messages.push({
          sender: "bot",
          text: aiResponse,
        });
        saveChatHistory();
      }
    } catch (error) {
      console.error("❌ Error parsing WebSocket response:", error);

      let loadingDiv = document.getElementById("loading-message");
      if (loadingDiv) {
        loadingDiv.remove();
      }

      displayMessage(event.data, "bot-message");
    }
  };

  socket.onerror = function (error) {
    console.error("❌ WebSocket Error: ", error);
  };

  return socket;
}

// ✅ Initialize WebSocket Connection
const socket = connectWebSocket();

const socket = connectWebSocket();

// ✅ Ensure chatSessions is initialized globally
let chatSessions = JSON.parse(localStorage.getItem("chatHistory")) || [];
let currentChatIndex = chatSessions.length > 0 ? chatSessions.length - 1 : 0;

function handleKeyPress(event) {
  if (event.key === "Enter") {
    sendMessage();
  }
}
function sendMessage() {
  let userInput = document.getElementById("user-input").value.trim();
  if (userInput === "") return;

  // ✅ Ensure chat session exists before adding messages
  if (!chatSessions[currentChatIndex]) {
    chatSessions[currentChatIndex] = { name: "New Chat", messages: [] };
  }

  let isFirstMessage = chatSessions[currentChatIndex].messages.length === 0;

  // ✅ Update chat name with first user message
  if (isFirstMessage) {
    chatSessions[currentChatIndex].name = userInput;
    updateChatHistoryUI(); // ✅ Ensure UI Updates
  }

  // ✅ Display user message
  displayMessage(userInput, "user-message");

  // ✅ Save user message in chat history
  chatSessions[currentChatIndex].messages.push({
    sender: "user",
    text: userInput,
  });

  document.getElementById("user-input").value = "";

  let chatBox = document.getElementById("chat-box");

  // ✅ Remove previous loading indicators before adding a new one
  let oldLoadingMessage = document.getElementById("loading-message");
  if (oldLoadingMessage) {
    oldLoadingMessage.remove();
  }

  // ✅ Create a loading animation container
  let loadingDiv = document.createElement("div");
  loadingDiv.id = "loading-message";
  loadingDiv.classList.add("bot-message");

  // ✅ Add spinner inside the bot message placeholder
  let spinner = document.createElement("div");
  spinner.classList.add("loading-animation");
  loadingDiv.appendChild(spinner);

  chatBox.appendChild(loadingDiv);
  chatBox.scrollTop = chatBox.scrollHeight;

  // ✅ Send message to WebSocket
  socket.send(userInput);
  saveChatHistory();
}

function displayMessage(message, className) {
  let chatBox = document.getElementById("chat-box");

  // ✅ Create a new message container for each message
  let messageDiv = document.createElement("div");
  messageDiv.classList.add("message", className);

  try {
    // ✅ Step 1: Check if the message is JSON (For Telecom Plans)
    if (typeof message === "string" && message.trim().startsWith("{")) {
      let data = JSON.parse(message);

      if (data.plans && Array.isArray(data.plans) && data.plans.length > 0) {
        console.log("✅ Displaying Plans:", data.plans);

        let formattedResponse = `
          <div class="plan-container">
            <div class="plan-header">📡 <b>Available Plans</b></div>
            <table class="plan-table">
              <thead>
                <tr>
                  <th>Price (₹)</th>
                  <th>Validity (Days)</th>
                  <th>Data Per Day (GB)</th>
                  <th>Benefits</th>
                </tr>
              </thead>
              <tbody>
                ${data.plans
                  .map(
                    (plan) => `
                    <tr>
                      <td>${plan.price}</td>
                      <td>${plan.validity}</td>
                      <td>${plan.dataPerDay}</td>
                      <td>${plan.benefits}</td>
                    </tr>
                  `
                  )
                  .join("")}
              </tbody>
            </table>
          </div>`;

        messageDiv.innerHTML = formattedResponse;
      } else {
        console.warn("⚠️ No valid 'plans' array found in JSON response.");
        messageDiv.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
      }
    } else {
      // ✅ Keep messages formatted properly (Remove **, * markdown)
      message = message
        .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
        .replace(/\*(.*?)\*/g, "<i>$1</i>");
      messageDiv.innerHTML = message;
    }
  } catch (error) {
    console.error("❌ Error parsing JSON response:", error);
    messageDiv.innerHTML = `<pre>${message}</pre>`; // Show raw text if JSON fails
  }

  // ✅ Append new message **without removing previous ones**
  chatBox.appendChild(messageDiv);
  chatBox.scrollTop = chatBox.scrollHeight; // Auto-scroll to latest message
}

// ✅ Function to display Sentiment Analysis Chart
function showSentimentChart(reportData) {
  console.log("🔹 Preparing to render chart with:", reportData);

  let chatBox = document.getElementById("chat-box");

  // ✅ Remove any existing chart before creating a new one
  let existingChart = document.getElementById("chart-container");
  if (existingChart) {
    existingChart.remove();
  }

  // ✅ Create chart container
  let chartContainer = document.createElement("div");
  chartContainer.id = "chart-container";
  chartContainer.classList.add("chart-container");

  // ✅ Add heading
  let heading = document.createElement("div");
  heading.innerHTML = "<b>📊 Sentiment Analysis Report</b>";
  heading.style.textAlign = "center";
  heading.style.fontSize = "16px";
  heading.style.marginBottom = "10px";
  chartContainer.appendChild(heading);

  // ✅ Create canvas
  let canvas = document.createElement("canvas");
  canvas.id = "sentimentChart";
  chartContainer.appendChild(canvas);

  // ✅ Append to chat box
  chatBox.appendChild(chartContainer);
  chatBox.scrollTop = chatBox.scrollHeight;

  let ctx = document.getElementById("sentimentChart").getContext("2d");

  console.log("✅ Final Report Data Sent to Chart.js:", reportData);

  // ✅ Destroy only if chart exists
  if (
    window.sentimentChart &&
    typeof window.sentimentChart.destroy === "function"
  ) {
    window.sentimentChart.destroy();
  }

  // ✅ Create Pie Chart
  window.sentimentChart = new Chart(ctx, {
    type: "pie",
    data: {
      labels: ["Positive", "Negative", "Neutral"],
      datasets: [
        {
          data: [
            reportData.Positive || 0,
            reportData.Negative || 0,
            reportData.Neutral || 0,
          ],
          backgroundColor: ["#28a745", "#dc3545", "#ffc107"],
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "bottom",
        },
      },
    },
  });

  console.log("✅ Chart successfully rendered.");
}

function saveChatHistory() {
  localStorage.setItem("chatHistory", JSON.stringify(chatSessions));
}

function loadChatHistory() {
  let storedHistory = localStorage.getItem("chatHistory");
  if (storedHistory) {
    try {
      chatSessions = JSON.parse(storedHistory);

      if (!Array.isArray(chatSessions) || chatSessions.length === 0) {
        console.warn(
          "⚠️ No valid chat sessions found, initializing empty session."
        );
        chatSessions = [{ name: "New Chat", messages: [] }];
      }

      updateChatHistoryUI();
      console.log("✅ Chat history loaded successfully:", chatSessions);

      // ✅ Load the most recent chat session on startup
      currentChatIndex = chatSessions.length - 1;
      loadChatSession(currentChatIndex);
    } catch (error) {
      console.error("❌ Error loading chat history:", error);
      chatSessions = [{ name: "New Chat", messages: [] }];
    }
  } else {
    chatSessions = [{ name: "New Chat", messages: [] }];
  }
}

function updateChatHistoryUI() {
  let historyList = document.getElementById("chat-history");
  historyList.innerHTML = ""; // ✅ Clear existing list

  chatSessions.forEach((session, index) => {
    let listItem = document.createElement("li");
    listItem.style.display = "flex";
    listItem.style.justifyContent = "space-between";
    listItem.style.alignItems = "center";
    listItem.style.padding = "10px";
    listItem.style.cursor = "pointer";
    listItem.style.borderBottom = "1px solid rgba(255, 255, 255, 0.1)";

    // ✅ Chat Name (Clickable)
    let chatName = document.createElement("span");
    chatName.textContent = session.name;
    chatName.style.cursor = "pointer";
    chatName.onclick = function () {
      console.log(`📌 Loading chat session: ${session.name}`);
      loadChatSession(index);
    };

    // ✅ Delete Button (❌)
    let deleteBtn = document.createElement("button");
    deleteBtn.innerText = "❌";
    deleteBtn.style.border = "none";
    deleteBtn.style.background = "transparent";
    deleteBtn.style.color = "red";
    deleteBtn.style.cursor = "pointer";
    deleteBtn.style.marginLeft = "10px";
    deleteBtn.onclick = (event) => {
      event.stopPropagation(); // ✅ Prevents chat from opening when deleting
      deleteChat(index);
    };

    listItem.appendChild(chatName);
    listItem.appendChild(deleteBtn);
    historyList.appendChild(listItem);
  });

  console.log("✅ Chat history UI updated:", chatSessions);
  saveChatHistory(); // ✅ Ensure chat history is saved
}

function startNewChat() {
  console.log("➕ Starting a new chat...");

  // ✅ Add new chat at the top instead of the bottom
  chatSessions.unshift({ name: "New Chat", messages: [] });
  currentChatIndex = 0; // ✅ Set the new chat as active

  saveChatHistory();
  updateChatHistoryUI();
  loadChatSession(currentChatIndex);
}

function loadChatSession(index) {
  if (!chatSessions[index]) {
    console.error("❌ Chat session not found at index:", index);
    return;
  }

  currentChatIndex = index;
  document.getElementById("chat-box").innerHTML = ""; // ✅ Clear chat box

  console.log("✅ Chat session loaded:", chatSessions[index]);

  // ✅ Load chat messages
  if (chatSessions[index].messages.length > 0) {
    chatSessions[index].messages.forEach((msg) => {
      displayMessage(
        msg.text,
        msg.sender === "user" ? "user-message" : "bot-message"
      );
    });
  } else {
    displayMessage("🔹 No messages in this chat.", "bot-message");
  }
}

function updateChatHistoryUI() {
  let historyList = document.getElementById("chat-history");
  historyList.innerHTML = ""; // ✅ Clear existing list

  chatSessions.forEach((session, index) => {
    if (!session || !session.name) {
      session = { name: `Chat ${index + 1}`, messages: [] };
      chatSessions[index] = session;
    }

    let listItem = document.createElement("li");
    listItem.style.display = "flex";
    listItem.style.justifyContent = "space-between";
    listItem.style.alignItems = "center";
    listItem.style.padding = "10px";
    listItem.style.cursor = "pointer";
    listItem.style.borderBottom = "1px solid rgba(255, 255, 255, 0.1)";

    // ✅ Chat Name (Clickable)
    let chatName = document.createElement("span");
    chatName.textContent = session.name;
    chatName.style.cursor = "pointer";
    chatName.onclick = function () {
      console.log(`📌 Loading chat session: ${session.name}`);
      loadChatSession(index);
    };

    // ✅ Delete Button (❌)
    let deleteBtn = document.createElement("button");
    deleteBtn.innerText = "❌";
    deleteBtn.style.border = "none";
    deleteBtn.style.background = "transparent";
    deleteBtn.style.color = "red";
    deleteBtn.style.cursor = "pointer";
    deleteBtn.style.marginLeft = "10px";
    deleteBtn.onclick = (event) => {
      event.stopPropagation(); // ✅ Prevents chat from opening when deleting
      deleteChat(index);
    };

    listItem.appendChild(chatName);
    listItem.appendChild(deleteBtn);
    historyList.appendChild(listItem);
  });

  console.log("✅ Chat history UI updated:", chatSessions);
  saveChatHistory(); // ✅ Ensure chat history is saved
}

function deleteChat(index) {
  if (chatSessions.length === 1) {
    chatSessions = [{ name: "New Chat", messages: [] }];
    currentChatIndex = 0;
  } else {
    chatSessions.splice(index, 1);
    if (currentChatIndex === index) {
      currentChatIndex = 0;
      loadChatSession(0);
    }
  }

  saveChatHistory();
  updateChatHistoryUI();
}

function saveChatHistory() {
  localStorage.setItem("chatHistory", JSON.stringify(chatSessions));
}

// ✅ Call loadChatHistory() when the window loads
window.onload = loadChatHistory;
