document.getElementById('archiveBtn').addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: 'archiveChat' }, (response) => {
      if (response && response.data) {
        chrome.runtime.sendMessage({ action: 'saveJson', data: response.data }, (saveResponse) => {
          alert(saveResponse.status === 'success' ? 'Chat archived!' : 'Error archiving chat.');
        });
      } else {
        alert('No chat data found. Ensure you\'re on a GPT page.');
      }
    });
  });
});