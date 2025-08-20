# GPT2JSON Archiver

A browser extension for Chrome and Edge that archives GPT user chat history as JSON, providing a lightweight, user-friendly solution for preserving conversational data. This project supports a methodology for structured chat archiving using web standards, suitable for business users, researchers, and developers.

## Features

- **Chat Capture**: Extracts chat messages from GPT interfaces (e.g., ChatGPT, Grok) via DOM scraping.
- **JSON Output**: Structures chat data with metadata (chat ID, user ID, timestamps) in a standardized JSON format.
- **Sequential Ordering**: Ensures messages are ordered correctly based on DOM position or timestamps.
- **File Download**: Saves chat history as a JSON file using the browser’s download API.
- **User-Friendly**: Simple popup interface for non-technical users, eliminating the need for programming environments.

## Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/your-username/gpt2json-browser-extension.git
   cd gpt2json-browser-extension
   ```

2. **Load the Extension**:
   - Open Chrome or Edge and navigate to `chrome://extensions/` or `edge://extensions/`.
   - Enable "Developer mode" (top right).
   - Click "Load unpacked" and select the `gpt2json-browser-extension` folder.

3. **Verify Icons**:
   - Ensure the `icons/` folder contains `icon16.png`, `icon48.png`, and `icon128.png`. If missing, generate placeholders using tools like [favicon.io](https://favicon.io).

## Usage

1. Navigate to a supported GPT interface (e.g., [chat.openai.com](https://chat.openai.com) or [grok.x.ai](https://grok.x.ai)).
2. Click the `GPT2JSON Archiver` extension icon in the browser toolbar.
3. Press the "Archive to JSON" button in the popup.
4. Choose a location to save the `gpt_chat_history.json` file when prompted.
5. The JSON file will contain structured chat data, including `chat_id`, `user_id`, `timestamp`, and `messages`.

### Example JSON Output
```json
{
  "chat_id": "chat_1634567890123",
  "user_id": "current_user",
  "timestamp": "2025-08-20T12:33:00Z",
  "messages": [
    {
      "role": "user",
      "content": "Hello, GPT!",
      "timestamp": "2025-08-20T12:32:50Z",
      "order": 0
    },
    {
      "role": "assistant",
      "content": "Hi! How can I assist you today?",
      "timestamp": "2025-08-20T12:32:55Z",
      "order": 1
    }
  ]
}
```

## Development

### Prerequisites
- [Visual Studio Code](https://code.visualstudio.com/) with the GitHub extension.
- Basic knowledge of JavaScript and Chrome/Edge extension development.

### Project Structure
- `manifest.json`: Extension configuration (Manifest V3).
- `content.js`: Scrapes chat data from GPT pages.
- `background.js`: Handles JSON file downloads.
- `popup.html`: User interface for triggering the archive.
- `popup.js`: Manages popup interactions.
- `icons/`: Extension icons (16x16, 48x48, 128x128 PNGs).

### Testing
1. Load the extension in Chrome/Edge (see Installation).
2. Open DevTools (`Ctrl+Shift+I`) on a GPT page to inspect DOM selectors.
3. Adjust selectors in `content.js` if needed (e.g., for specific classes like `.message` or `[role="message"]`).
4. Test file downloads by clicking "Archive to JSON" and checking the browser’s download prompt.

### Debugging
- Check console logs in:
  - Popup: Right-click the popup > Inspect > Console.
  - Service Worker: `chrome://extensions/` > click "service worker" under the extension.
- Ensure `matches` in `manifest.json` aligns with target GPT URLs.

## Contributing

Contributions are welcome! To contribute:
1. Fork the repository.
2. Create a branch: `git checkout -b feature/your-feature`.
3. Commit changes: `git commit -m "Add your feature"`.
4. Push to GitHub: `git push origin feature/your-feature`.
5. Open a pull request via the GitHub extension in VS Code or the GitHub website.

Please include tests and update documentation as needed. All contributions must comply with the [GPL-3.0 License](LICENSE).

## Limitations

- **DOM Dependency**: The extension relies on specific DOM structures. Changes to GPT interfaces may require updates to `content.js` selectors.
- **File Saving**: Users must manually approve downloads due to browser security restrictions.
- **Supported Sites**: Currently targets `chat.openai.com` and `grok.x.ai`. Add more URLs to `manifest.json` as needed.

## Future Work

- Add HTML rendering for visual chat archives.
- Support cloud storage integration (e.g., Google Drive API).
- Implement data encryption for enhanced privacy.

## License

This project is licensed under the [GNU General Public License v3.0](LICENSE). See the `LICENSE` file for details.

## Contact

For questions or feedback, open an issue on GitHub or contact [your-email@example.com](mailto:your-email@example.com).