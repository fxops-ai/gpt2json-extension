// Selection mode logic for user/assistant message identification
let selectionMode = false;
let selectionRole = null;
let highlightHandler = null;
let clickHandler = null;

function startSelectionMode(role) {
  selectionMode = true;
  selectionRole = role;
  document.body.style.cursor = 'crosshair';

  highlightHandler = function(e) {
    if (!selectionMode) return;
    const bg = window.getComputedStyle(e.target).backgroundColor;
    if (role === 'user' && (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent')) return;
    
    // Clear any fade timer if re-hovering
    if (e.target._fadeTimer) {
      clearTimeout(e.target._fadeTimer);
      e.target._fadeTimer = null;
    }
    
    // Add highlight immediately with transition
    e.target.style.transition = 'box-shadow 0.5s ease';
    e.target.style.boxShadow = '0 0 0 2px ' + (role === 'user' ? 'blue' : 'green');
  };

  const removeHighlightHandler = function(e) {
    // Start fade out after 2 seconds
    if (e.target._fadeTimer) clearTimeout(e.target._fadeTimer);
    e.target._fadeTimer = setTimeout(() => {
      e.target.style.boxShadow = '0 0 0 0 transparent';
      e.target._fadeTimer = null;
    }, 2000);
  };

  clickHandler = function(e) {
    if (!selectionMode) return;
    const bg = window.getComputedStyle(e.target).backgroundColor;
    if (role === 'user' && (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent')) {
      alert('Please select a user message element with a visible background color.');
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    document.body.style.cursor = '';
    selectionMode = false;
    // Clear all highlights and timers
    Array.from(document.querySelectorAll('*')).forEach(el => {
      if (el._fadeTimer) clearTimeout(el._fadeTimer);
      el.style.boxShadow = '';
      el.style.transition = '';
      el._fadeTimer = null;
    });
    // Capture selector info with priority for simpler selectors
    function generateSelector(element) {
      // Priority 1: data-testid
      if (element.getAttribute('data-testid')) {
        return `[data-testid="${element.getAttribute('data-testid')}"]`;
      }
      
      // Priority 2: Look for key semantic classes
      const classes = Array.from(element.classList);
      const keyClasses = classes.filter(cls => 
        cls.includes('message') || 
        cls.includes('bubble') || 
        cls.includes('chat') || 
        cls.includes('response') ||
        cls === 'user' || 
        cls === 'assistant'
      );
      
      if (keyClasses.length > 0) {
        return '.' + keyClasses[0]; // Use the first key class only
      }
      
      // Priority 3: Use first meaningful class (avoid utility classes)
      const meaningfulClasses = classes.filter(cls => 
        !cls.startsWith('r-') &&      // Avoid React utility classes
        !cls.startsWith('css-') &&    // Avoid generated CSS classes  
        !cls.includes(':') &&         // Avoid pseudo-class syntax
        !cls.includes('[') &&         // Avoid bracket notation
        !cls.includes('prose-') &&    // Avoid prose utility classes
        cls.length > 2                // Avoid single-letter classes
      );
      
      if (meaningfulClasses.length > 0) {
        return '.' + meaningfulClasses[0];
      }
      
      // Priority 4: Fallback to simple combinations
      if (classes.includes('message-bubble')) {
        return '.message-bubble';
      }
      
      // Priority 5: Element tag as last resort
      return element.tagName.toLowerCase();
    }

    const selector = generateSelector(e.target);
    // Capture background color if user role
    let bgColor = null;
    if (role === 'user') {
        bgColor = bg; // Already computed
        chrome.storage.local.set({ userBgColor: bgColor }, () => {
            console.log(`Saved userBgColor: ${bgColor}`);
        });
    }
    alert(`Selected ${role} element: ${selector}${bgColor ? ' (bg: ' + bgColor + ')' : ''}`);
    // Send selector to background/popup and save to chrome.storage
    chrome.runtime.sendMessage({ action: 'elementSelected', role, selector, bgColor });
    const key = role === 'user' ? 'userSelector' : 'assistantSelector';
    chrome.storage.local.set({ [key]: selector }, () => {
        console.log(`Saved ${key}: ${selector}`);
    });
    document.removeEventListener('mouseover', highlightHandler, true);
    document.removeEventListener('mouseout', removeHighlightHandler, true);
    document.removeEventListener('click', clickHandler, true);
  };

  document.addEventListener('mouseover', highlightHandler, true);
  document.addEventListener('mouseout', removeHighlightHandler, true);
  document.addEventListener('click', clickHandler, true);
}

console.log('Content script loaded on:', window.location.href, 'at', new Date().toISOString());

function checkDomReadiness() {
  console.log('checkDomReadiness called at', new Date().toISOString());
  
  // More comprehensive selectors for chat containers
  const selectors = [
    '[data-testid="primaryColumn"]',
    'main[role="main"]',
    'main',  // Added for Grok domain
    '[data-testid="grok-conversation"]',
    '[data-testid="conversation"]',
    '.chat-container',
    '[role="main"]',
    // Generic fallbacks
    'div[class*="chat"]',
    'div[class*="conversation"]',
    'div[class*="messages"]'
  ];
  
  for (const selector of selectors) {
    const container = document.querySelector(selector);
    if (container) {
      console.log('DOM ready, chat container found:', selector, container.tagName, container.getAttribute('data-testid') || 'no testid');
      return container;
    }
  }
  
  // Last resort: look for elements with significant content that might be chat containers
  const candidateContainers = Array.from(document.querySelectorAll('div, main, section'))
    .filter(el => {
      const textContent = el.textContent.trim();
      const childDivs = el.querySelectorAll('div').length;
      return textContent.length > 100 && childDivs > 5; // Likely to be a chat container
    })
    .sort((a, b) => b.textContent.length - a.textContent.length); // Sort by content length
  
  if (candidateContainers.length > 0) {
    console.log('DOM ready, fallback container found:', candidateContainers[0].tagName, candidateContainers[0].className);
    return candidateContainers[0];
  }
  
  console.log('DOM not ready, no chat container found');
  return null;
}

// Utility to get selectors from chrome.storage
function getRoleSelectors() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['userSelector', 'assistantSelector'], (result) => {
      resolve({
        userSelector: result.userSelector,
        assistantSelector: result.assistantSelector
      });
    });
  });
}

// Extraction logic using selectors
function extractChatMessages(chatContainer) {
  return new Promise((resolve) => {
    chrome.storage.local.get(['userSelector', 'assistantSelector', 'userBgColor'], (storageData) => {
      const userSelector = storageData.userSelector;
      const assistantSelector = storageData.assistantSelector;
      const userBgColor = storageData.userBgColor;

      console.log('Stored selectors:', { userSelector, assistantSelector, userBgColor });

      if (!userSelector || !userBgColor) {
        throw new Error('User selector or background color not found. Please select a user element first.');
      }

      // Collect all elements in DOM order for accurate positioning
      const allElements = Array.from(chatContainer.querySelectorAll('div, span, p'));
      const userMessagesContent = new Set();
      let userMessages = [];
      
      if (userSelector) {
        userMessages = Array.from(chatContainer.querySelectorAll(userSelector))
          .filter(el => window.getComputedStyle(el).backgroundColor === userBgColor) // Pre-filter by background color
          .map((el, idx) => {
            const content = el.textContent.trim();
            const bg = window.getComputedStyle(el).backgroundColor;
            const domIndex = allElements.indexOf(el);
            
            if (!content || content.length < 3) {
              console.log(`User candidate ${idx} filtered:`, { content: content.substring(0, 50), bg, domIndex, reason: 'Invalid content or too short' });
              return null;
            }
            if (content.includes('Auto') || content.includes('See new posts')) {
              console.log(`User candidate ${idx} filtered:`, { content: content.substring(0, 50), bg, domIndex, reason: 'Contains Auto or See new posts' });
              return null;
            }
            if (bg !== userBgColor) {
              console.log(`User candidate ${idx} filtered:`, { content: content.substring(0, 50), bg, domIndex, reason: `Background color does not match ${userBgColor}` });
              return null;
            }
            
            console.log(`User candidate ${idx} accepted:`, { content: content.substring(0, 50), bg, domIndex, matchesUserSelector: true });
            userMessagesContent.add(content);
            return { role: 'user', content, timestamp: new Date().toISOString(), domIndex };
          })
          .filter(Boolean);
      }

      // Fallback for user messages if none found
      if (userMessages.length === 0) {
        console.log('No user messages found with userSelector, trying fallback by background color');
        userMessages = Array.from(chatContainer.querySelectorAll('div, span, p'))
          .filter(el => window.getComputedStyle(el).backgroundColor === userBgColor)
          .map((el, idx) => {
            const content = el.textContent.trim();
            const bg = window.getComputedStyle(el).backgroundColor;
            const domIndex = allElements.indexOf(el);
            
            if (!content || content.length < 3) {
              console.log(`User fallback ${idx} filtered:`, { content: content.substring(0, 50), bg, domIndex, reason: 'Invalid content or too short' });
              return null;
            }
            if (content.includes('Auto') || content.includes('See new posts')) {
              console.log(`User fallback ${idx} filtered:`, { content: content.substring(0, 50), bg, domIndex, reason: 'Contains Auto or See new posts' });
              return null;
            }
            
            console.log(`User fallback ${idx} accepted:`, { content: content.substring(0, 50), bg, domIndex, matchesUserSelector: el.matches(userSelector || '') });
            userMessagesContent.add(content);
            return { role: 'user', content, timestamp: new Date().toISOString(), domIndex };
          })
          .filter(Boolean);
      }

      // Collect assistant messages - removed leaf element check to allow complex message bubbles
      let assistantMessages = [];
      if (assistantSelector) {
        assistantMessages = Array.from(chatContainer.querySelectorAll(assistantSelector))
          .filter(el => {
            const content = el.textContent.trim();
            const bg = window.getComputedStyle(el).backgroundColor;
            const isUserContent = userMessagesContent.has(content);
            const hasUserBgColor = bg === userBgColor;
            
            // Exclude only based on content match or user background color
            if (isUserContent || hasUserBgColor) {
              console.log(`Excluded assistant candidate:`, { 
                content: content.substring(0, 50), 
                bg, 
                reason: `User-related: content=${isUserContent}, bg=${hasUserBgColor}` 
              });
              return false;
            }
            
            // Removed leaf element check - assistant messages often have complex nested structure
            return true;
          })
          .map((el, idx) => {
            const content = el.textContent.trim();
            const bg = window.getComputedStyle(el).backgroundColor;
            const domIndex = allElements.indexOf(el);
            
            console.log(`Processing assistant candidate ${idx}:`, { content: content.substring(0, 50), bg, domIndex });
            
            if (!content || content.length < 3) {
              console.log(`Assistant candidate ${idx} filtered:`, { content: content.substring(0, 50), bg, domIndex, reason: 'Invalid content or too short' });
              return null;
            }
            if (content.includes('Auto') || content.includes('See new posts')) {
              console.log(`Assistant candidate ${idx} filtered:`, { content: content.substring(0, 50), bg, domIndex, reason: 'Contains Auto or See new posts' });
              return null;
            }
            
            console.log(`Assistant candidate ${idx} accepted:`, { content: content.substring(0, 50), bg, domIndex, matchesAssistantSelector: true });
            return { role: 'assistant', content, timestamp: new Date().toISOString(), domIndex };
          })
          .filter(Boolean);
      } else {
        // Fallback: collect non-user elements with valid content
        assistantMessages = Array.from(chatContainer.querySelectorAll('div, span, p'))
          .filter(el => {
            const content = el.textContent.trim();
            const bg = window.getComputedStyle(el).backgroundColor;
            const isUserContent = userMessagesContent.has(content);
            const matchesUserSelector = userSelector && el.matches(userSelector);
            const hasUserBgColor = bg === userBgColor;
            
            if (isUserContent || matchesUserSelector || hasUserBgColor) {
              return false;
            }
            
            const childText = Array.from(el.querySelectorAll('*')).reduce((sum, child) => sum + (child.textContent.trim().length || 0), 0);
            return childText <= content.length * 1.1;
          })
          .map((el, idx) => {
            const content = el.textContent.trim();
            const bg = window.getComputedStyle(el).backgroundColor;
            const domIndex = allElements.indexOf(el);
            
            if (!content || content.length < 3) {
              return null;
            }
            if (content.includes('Auto') || content.includes('See new posts')) {
              return null;
            }
            
            return { role: 'assistant', content, timestamp: new Date().toISOString(), domIndex };
          })
          .filter(Boolean);
      }

      // Deduplicate by content and role
      function dedupe(messages) {
        const seen = new Set();
        return messages.filter(msg => {
          const key = msg.role + '|' + msg.content;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }
      userMessages = dedupe(userMessages);
      assistantMessages = dedupe(assistantMessages);

      // Merge and sort by DOM position
      let allMessages = userMessages.concat(assistantMessages);
      console.log('Messages before sorting:', allMessages);
      allMessages.sort((a, b) => a.domIndex - b.domIndex);
      allMessages.forEach((msg, idx) => { msg.order = idx; delete msg.domIndex; });

      console.log('Final extracted messages:', allMessages);

      if (allMessages.length === 0) {
        throw new Error('No valid chat messages extracted.');
      }
      
      const chatData = {
        chat_id: `chat_${Date.now()}`,
        user_id: 'current_user',
        timestamp: new Date().toISOString(),
        messages: allMessages
      };
      resolve(chatData);
    });
  });
}

function tryExtractChatMessages() {
  return new Promise((resolve, reject) => {
    console.log('Attempting to extract chat messages...');
    
    const maxRetries = 3; // Reduced retries
    let retryCount = 0;
    
    function attemptExtraction() {
      const chatContainer = checkDomReadiness();
      if (chatContainer) {
        console.log('Chat container found, extracting messages...');
        extractChatMessages(chatContainer)
          .then(messages => {
            console.log('Successfully extracted messages:', messages);
            resolve(messages);
          })
          .catch(error => {
            console.error('Error extracting messages:', error);
            reject(error);
          });
      } else {
        retryCount++;
        if (retryCount < maxRetries) {
          console.log(`DOM not ready, retry ${retryCount}/${maxRetries} in 500ms...`);
          setTimeout(attemptExtraction, 500); // Shorter timeout
        } else {
          console.error('Max retries reached, DOM not ready');
          reject(new Error('React not ready - chat container not found after multiple attempts'));
        }
      }
    }
    
    // Add timeout for entire operation to prevent indefinite hanging
    const operationTimeout = setTimeout(() => {
      reject(new Error('Operation timed out after 10 seconds'));
    }, 10000);
    
    // Clear timeout on completion
    const originalResolve = resolve;
    const originalReject = reject;
    resolve = (value) => {
      clearTimeout(operationTimeout);
      originalResolve(value);
    };
    reject = (error) => {
      clearTimeout(operationTimeout);
      originalReject(error);
    };
    
    attemptExtraction();
  });
}

// Message listener
console.log('Content script listener registered at', new Date().toISOString());
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message);
  
  if (message.action === 'startSelect' && message.role) {
    console.log(`Activating selection mode for role: ${message.role}`);
    startSelectionMode(message.role);
    sendResponse({ status: 'selection_mode_started' });
    return false; // Synchronous response
  }
  
  if (message.action === 'archiveChat') {
    console.log('Starting chat extraction...');
    
    // Handle async operation with proper error handling
    tryExtractChatMessages()
      .then(messages => {
        console.log('Sending successful response:', messages);
        try {
          sendResponse({ data: messages });
        } catch (e) {
          console.error('Failed to send response:', e);
        }
      })
      .catch(error => {
        console.error('Extraction failed:', error);
        try {
          sendResponse({ error: error.message });
        } catch (e) {
          console.error('Failed to send error response:', e);
        }
      });
    
    return true; // Keep channel open for async response
  }
  
  // Handle unknown actions synchronously
  console.log('Unknown action:', message.action);
  sendResponse({ error: 'Unknown action' });
  return false;
});

// Initial DOM check for debugging
setTimeout(() => {
  console.log('Initial DOM check at', new Date().toISOString());
  const chatContainer = checkDomReadiness();
  if (chatContainer) {
    console.log('Chat container found on initial check:', chatContainer.tagName, chatContainer.getAttribute('data-testid') || chatContainer.className || 'no identifier');
  } else {
    console.log('No chat container on initial check. Will retry when archiveChat is called.');
  }
}, 1000);