chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveJson') {
    const jsonData = JSON.stringify(request.data, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    chrome.downloads.download({
      url: url,
      filename: 'gpt_chat_history.json',
      saveAs: true // Prompt user for location
    }, () => {
      sendResponse({ status: 'success' });
    });
  }
  return true;
});