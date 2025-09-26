document.addEventListener('DOMContentLoaded', () => {
  console.log('Popup loaded at', new Date().toISOString());
  
  const archiveButton = document.getElementById('archiveButton');
  const selectUserButton = document.getElementById('selectUserButton');
  const selectAssistantButton = document.getElementById('selectAssistantButton');
  const resetButton = document.getElementById('resetButton');

  if (!archiveButton || !selectUserButton || !selectAssistantButton) {
    console.error('One or more buttons not found.');
    alert('Error: Missing buttons in popup');
    return;
  }

  // On load, check selection state and update buttons
  chrome.storage.local.get(['userSelected', 'assistantSelected'], (result) => {
    if (result.userSelected) {
      selectUserButton.disabled = true;
      selectUserButton.style.backgroundColor = '#ccc';
      selectUserButton.style.cursor = 'not-allowed';
    }
    if (result.assistantSelected) {
      selectAssistantButton.disabled = true;
      selectAssistantButton.style.backgroundColor = '#ccc';
      selectAssistantButton.style.cursor = 'not-allowed';
    }
  });

  // Selection button handlers
  selectUserButton.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) {
        console.error('No active tab found');
        return;
      }
      console.log('Sending startSelect message for user');
      chrome.tabs.sendMessage(tabs[0].id, { action: 'startSelect', role: 'user' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error sending startSelect message:', chrome.runtime.lastError);
        } else {
          console.log('StartSelect response:', response);
        }
      });
    });
  });

  selectAssistantButton.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) {
        console.error('No active tab found');
        return;
      }
      console.log('Sending startSelect message for assistant');
      chrome.tabs.sendMessage(tabs[0].id, { action: 'startSelect', role: 'assistant' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error sending startSelect message:', chrome.runtime.lastError);
        } else {
          console.log('StartSelect response:', response);
        }
      });
    });
  });

  // Archive button with improved error handling and timeout
  archiveButton.addEventListener('click', () => {
    console.log('Archive button clicked at', new Date().toISOString());
    
    // Disable button to prevent multiple clicks
    archiveButton.disabled = true;
    archiveButton.textContent = 'Processing...';
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) {
        console.error('No active tab found');
        alert('Error: No active tab found');
        resetArchiveButton();
        return;
      }
      
      console.log('Sending archiveChat message to tab:', tabs[0].id);
      
      // Set up timeout for the message
      let responseReceived = false;
      const messageTimeout = setTimeout(() => {
        if (!responseReceived) {
          console.error('Message timeout - no response received within 15 seconds');
          alert('Operation timed out. Please try again.');
          resetArchiveButton();
        }
      }, 15000); // 15 second timeout
      
      chrome.tabs.sendMessage(tabs[0].id, { action: 'archiveChat' }, (response) => {
        responseReceived = true;
        clearTimeout(messageTimeout);
        
        console.log('Archive response received:', response);
        
        if (chrome.runtime.lastError) {
          console.error('Chrome runtime error:', chrome.runtime.lastError);
          alert('Error: ' + chrome.runtime.lastError.message);
          resetArchiveButton();
          return;
        }
        
        if (!response) {
          console.error('No response received from content script');
          alert('Error: No response from content script. Make sure you\'re on a chat page.');
          resetArchiveButton();
          return;
        }
        
        if (response.error) {
          console.error('Content script error:', response.error);
          alert('Error: ' + response.error);
          resetArchiveButton();
          return;
        }
        
        if (response.data) {
          console.log('Successfully received chat data:', response.data);
          
          try {
            const jsonString = JSON.stringify(response.data, null, 2);
            const dataUrl = 'data:application/json;charset=utf-8,' + encodeURIComponent(jsonString);
            
            chrome.downloads.download({
              url: dataUrl,
              filename: `chat_archive_${Date.now()}.json`,
              saveAs: true
            }, (downloadId) => {
              if (chrome.runtime.lastError) {
                console.error('Download error:', chrome.runtime.lastError);
                alert('Error downloading file: ' + chrome.runtime.lastError.message);
              } else {
                console.log('Download started with ID:', downloadId);
                alert('Chat archived successfully!');
              }
              resetArchiveButton();
            });
          } catch (e) {
            console.error('Error processing chat data:', e);
            alert('Error processing chat data: ' + e.message);
            resetArchiveButton();
          }
        } else {
          console.error('No data in response:', response);
          alert('No chat data found. Ensure you\'re on a chat page with messages.');
          resetArchiveButton();
        }
      });
    });
  });

  function resetArchiveButton() {
    archiveButton.disabled = false;
    archiveButton.textContent = 'Archive to JSON';
  }

  // Reset button handler
  if (resetButton) {
    resetButton.addEventListener('click', () => {
      chrome.storage.local.remove(['userSelected', 'assistantSelected', 'userSelector', 'assistantSelector', 'userBgColor'], () => {
        selectUserButton.disabled = false;
        selectUserButton.style.backgroundColor = '';
        selectUserButton.style.cursor = 'pointer';
        selectAssistantButton.disabled = false;
        selectAssistantButton.style.backgroundColor = '';
        selectAssistantButton.style.cursor = 'pointer';
        console.log('Selections have been reset');
        alert('Selections have been reset.');
      });
    });
  }

  // Listen for selection confirmation from content script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Received message in popup.js:', message);
    
    if (message.action === 'elementSelected' && message.role) {
      console.log(`Disabling button for role: ${message.role}`);
      
      if (message.role === 'user') {
        selectUserButton.disabled = true;
        selectUserButton.style.backgroundColor = '#ccc';
        selectUserButton.style.cursor = 'not-allowed';
        console.log('User button disabled and greyed out');
      } else if (message.role === 'assistant') {
        selectAssistantButton.disabled = true;
        selectAssistantButton.style.backgroundColor = '#ccc';
        selectAssistantButton.style.cursor = 'not-allowed';
        console.log('Assistant button disabled and greyed out');
      }
      
      sendResponse({ status: 'received' });
    }
  });
});