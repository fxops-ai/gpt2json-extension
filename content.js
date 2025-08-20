// Listen for messages from popup/background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'archiveChat') {
    const messages = extractChatMessages();
    sendResponse({ data: messages });
  }
  return true; // Keep the message channel open for async response
});

// Function to extract messages from DOM
function extractChatMessages() {
  const chatContainer = document.querySelector('.chat-container') || document.body; // Adjust selector to match GPT interface
  const messageElements = chatContainer.querySelectorAll('.message, [role="message"]'); // Common selectors for chat messages
  const chatData = Array.from(messageElements).map((el, index) => {
    const role = el.querySelector('.user') ? 'user' : 'assistant'; // Adjust based on classes or attributes
    const content = el.textContent.trim();
    const timestamp = el.dataset.timestamp || new Date().toISOString(); // Use existing timestamp or generate
    return { role, content, timestamp, order: index };
  });

  // Sort by order or timestamp if needed
  chatData.sort((a, b) => a.order - b.order || new Date(a.timestamp) - new Date(b.timestamp));

  return {
    chat_id: `chat_${Date.now()}`,
    user_id: 'current_user', // Replace with actual if available
    timestamp: new Date().toISOString(),
    messages: chatData
  };
}

// Optional: Observe DOM changes for dynamic chats
const observer = new MutationObserver(() => {
  // Re-extract if needed, but for simplicity, extract on demand
});
observer.observe(document.body, { childList: true, subtree: true });