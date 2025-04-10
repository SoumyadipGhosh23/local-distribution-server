const express = require('express');
const serveIndex = require('serve-index');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const qrcode = require('qrcode-terminal');


const app = express();
const PORT = 8000;

// Drop folder path
const dropFolder = path.join(os.homedir(), 'Downloads');
console.log(`Drop folder: ${dropFolder}`);

// Clipboard history storage
let clipboardHistory = [];

// Middleware to serve static files and file list
app.use(
    '/',
    express.static(dropFolder),
    serveIndex(dropFolder, {
        icons: true,
        filter: (filename, index, files, dir) => {
            // Exclude specific files and folders
            const hiddenItems = ['node_modules', 'Icon', 'package.json', 'package-lock.json', 'server.js'];
            return !hiddenItems.includes(path.basename(filename));
        },
    })
);

// Route to display clipboard history
app.get('/clipboard', async (req, res) => {
    const clipboardy = await import('clipboardy');
    const currentClipboard = clipboardy.default.readSync();

    if (!clipboardHistory.includes(currentClipboard)) {
        clipboardHistory.push(currentClipboard);
    }

    // Safely encode clipboard items for HTML
    const escapeHtml = (text) =>
        text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');

    res.send(`
        <html>
            <head>
                <title>📋 Clipboard History</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        margin: 0;
                        padding: 20px;
                        background: #f0f2f5;
                    }
                    h1 {
                        text-align: center;
                        color: #2c3e50;
                        margin-bottom: 30px;
                    }
                    .clip-container {
                        display: flex;
                        flex-direction: column;
                        gap: 15px;
                        max-width: 700px;
                        margin: auto;
                    }
                    .clip-item {
                        background: white;
                        padding: 15px;
                        border-radius: 10px;
                        box-shadow: 0 2px 6px rgba(0,0,0,0.1);
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        word-break: break-word;
                    }
                    .clip-text {
                        flex: 1;
                        margin-right: 10px;
                    }
                    button.copy-btn {
                        padding: 6px 12px;
                        background-color: #007bff;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                        font-size: 14px;
                    }
                    button.copy-btn:active {
                        background-color: #0056b3;
                    }
                </style>
            </head>
            <body>
                <h1>📋 Clipboard History</h1>
                <div class="clip-container">
                    ${clipboardHistory
            .map(
                (item) => `
                            <div class="clip-item">
                                <div class="clip-text">${escapeHtml(item)}</div>
                                <button class="copy-btn" onclick="copyToClipboard(\`${escapeHtml(item)}\`)">Copy</button>
                            </div>`
            )
            .join('')}
                </div>
                        <script>
            function copyToClipboard(text) {
                const textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.style.position = 'fixed';  // Prevent scrolling to bottom on iOS
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.focus();
                textarea.select();

                try {
                    const successful = document.execCommand('copy');
                    if (successful) {
                        alert('Copied to clipboard!');
                    } else {
                        alert('Failed to copy. Long-press to select manually.');
                    }
                } catch (err) {
                    alert('Copy not supported. Long-press to select manually.');
                }

                document.body.removeChild(textarea);
            }
            </script>
            </body>
        </html>
    `);
});


// Start server
app.listen(PORT, () => {
    try {
        const ip = execSync('ipconfig getifaddr en0').toString().trim();
        const url = `http://${ip}:${PORT}`;
        console.log("Your Mobile Device Must be Connected to the Same Network as the Server");
        console.log(`📂 FileDrop available at: ${url}`);
        qrcode.generate(url, { small: true });
        console.log(`📋 Clipboard available at: ${url}/clipboard`);
        qrcode.generate(`${url}/clipboard`, { small: true });
    } catch (error) {
        console.error('❌ Could not get IP address:', error);
    }
});
