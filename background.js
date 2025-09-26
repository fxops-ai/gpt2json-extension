console.log('Background script loaded at', new Date().toISOString());

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request.action, 'at', new Date().toISOString());
  
  try {
    if (request.action === 'saveJson') {
      console.log('Save JSON request received:', request.data);
      sendResponse({ status: 'success' });
      return false; // Synchronous response
      
    } else if (request.action === 'elementSelected') {
      // Store selection state in chrome.storage
      const key = request.role === 'user' ? 'userSelected' : 'assistantSelected';
      chrome.storage.local.set({ [key]: true }, () => {
        console.log(`Selection state saved: ${key}`);
        try {
          sendResponse({ status: 'stored' });
        } catch (e) {
          console.error('Error sending response:', e);
        }
      });
      return true; // Async response for storage operation
      
    } else {
      console.log('Unknown action:', request.action);
      sendResponse({ status: 'error', message: 'Unknown action' });
      return false; // Synchronous response
    }
  } catch (error) {
    console.error('Error in background message handler:', error);
    try {
      sendResponse({ status: 'error', message: error.message });
    } catch (e) {
      console.error('Failed to send error response:', e);
    }
    return false;
  }
});