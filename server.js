const express = require('express');
const serveIndex = require('serve-index');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const qrcode = require('qrcode-terminal');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = 8000;
const dropFolder = path.join(os.homedir(), 'Downloads');
console.log(`Drop folder: ${dropFolder}`);

let clipboardHistory = [];

// Setup multer for file uploads
const storage = multer.diskStorage({
    destination: dropFolder,
    filename: (req, file, cb) => {
        const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        cb(null, `${Date.now()}_${safeName}`);
    },
});
const upload = multer({ storage });

// Clipboard view
app.get('/clipboard', async (req, res) => {
    const clipboardy = await import('clipboardy');
    const currentClipboard = clipboardy.default.readSync();

    if (!clipboardHistory.includes(currentClipboard)) {
        clipboardHistory.push(currentClipboard);
    }

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
                body { font-family: sans-serif; background: #f5f5f5; padding: 20px; }
                h1 { text-align: center; }
                form { max-width: 700px; margin: 20px auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 6px rgba(0,0,0,0.1); }
                textarea { width: 100%; height: 80px; padding: 10px; font-size: 16px; }
                button.send-btn { margin-top: 10px; padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer; }
                .clip-container { max-width: 700px; margin: auto; display: flex; flex-direction: column; gap: 10px; }
                .clip-item { background: white; padding: 15px; border-radius: 10px; box-shadow: 0 2px 6px rgba(0,0,0,0.1); display: flex; justify-content: space-between; align-items: center; word-break: break-word; }
                .clip-text { flex: 1; margin-right: 10px; }
                button.copy-btn { padding: 6px 12px; background-color: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; }
            </style>
        </head>
        <body>
            <h1>📋 Clipboard History</h1>

            <form method="POST" action="/clipboard">
                <textarea name="clip" placeholder="Paste anything from your phone here..."></textarea><br />
                <button type="submit" class="send-btn">Send to Mac</button>
            </form>

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
                    textarea.style.position = 'fixed';
                    textarea.style.opacity = '0';
                    document.body.appendChild(textarea);
                    textarea.focus();
                    textarea.select();
                    try {
                        const success = document.execCommand('copy');
                        alert(success ? 'Copied to clipboard!' : 'Failed to copy.');
                    } catch {
                        alert('Copy failed.');
                    }
                    document.body.removeChild(textarea);
                }
            </script>
        </body>
        </html>
    `);
});

// Handles user input from the manual clipboard textbox
app.post('/clipboard', express.urlencoded({ extended: true }), (req, res) => {
    const clip = req.body.clip;
    if (clip) {
        console.log(`📥 Received clipboard from text field:\n${clip}`);
    }
    res.redirect('/clipboard');
});


// Mobile-friendly upload UI
app.get('/upload', (req, res) => {
    res.send(`
        <html>
        <head>
            <title>📤 Upload to Mac</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                * {
                    box-sizing: border-box;
                }

                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background: linear-gradient(to right, #f8f9fa, #e9ecef);
                    margin: 0;
                    padding: 20px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                }

                .container {
                    background: white;
                    padding: 30px 25px;
                    border-radius: 12px;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.1);
                    text-align: center;
                    width: 100%;
                    max-width: 400px;
                }

                h1 {
                    font-size: 1.8rem;
                    margin-bottom: 1rem;
                    color: #333;
                }

                input[type="file"] {
                    display: block;
                    margin: 20px auto;
                    width: 100%;
                    font-size: 1rem;
                    padding: 10px;
                    border: 2px dashed #ccc;
                    border-radius: 8px;
                    background-color: #fafafa;
                    cursor: pointer;
                    transition: border-color 0.3s;
                }

                input[type="file"]:hover {
                    border-color: #007bff;
                }

                button {
                    margin-top: 15px;
                    padding: 12px 20px;
                    font-size: 1rem;
                    background-color: #007bff;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: background-color 0.3s ease;
                    width: 100%;
                }

                button:hover {
                    background-color: #0056b3;
                }

                @media (max-width: 480px) {
                    h1 {
                        font-size: 1.5rem;
                    }

                    .container {
                        padding: 20px;
                    }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>📤 Upload File to Mac</h1>
                <form action="/upload" method="POST" enctype="multipart/form-data">
                    <input type="file" name="file" multiple required />
                    <button type="submit">Upload</button>
                </form>
            </div>
        </body>
        </html>
    `);
});


// Upload handler
app.post('/upload', upload.array('file', 12), (req, res) => {
    const files = req.files.map((file) => file.originalname);
    res.send(`
        <html>
        <head>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background: linear-gradient(to right, #f8f9fa, #e9ecef);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100vh;
                    margin: 0;
                    color: #343a40;
                    animation: fadeIn 0.6s ease-in-out;
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                h2 {
                    font-size: 2rem;
                    margin-bottom: 1rem;
                }

                p {
                    font-size: 1.1rem;
                    max-width: 80%;
                }

                strong {
                    color: #007bff;
                }

                a {
                    margin-top: 2rem;
                    display: inline-block;
                    background-color: #007bff;
                    color: white;
                    padding: 0.6rem 1.2rem;
                    border-radius: 8px;
                    text-decoration: none;
                    transition: background-color 0.3s ease;
                }

                a:hover {
                    background-color: #0056b3;
                }

                .file-list {
                    margin-top: 1rem;
                    background: white;
                    padding: 1rem 1.5rem;
                    border-radius: 10px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                }

                .file-list span {
                    display: block;
                    margin: 0.2rem 0;
                    font-weight: 500;
                }
            </style>
        </head>
        <body>
            <h2>✅ Files Uploaded Successfully!</h2>
            <div class="file-list">
                <p>Saved to Downloads:</p>
                ${files.map(file => `<span>📁 ${file}</span>`).join('')}
            </div>
            <a href="/upload">🔙 Upload More</a>
        </body>
        </html>
    `);
});




// Serve file browser
app.use(
    '/',
    express.static(dropFolder),
    serveIndex(dropFolder, {
        icons: true,
        filter: (filename) => {
            const hiddenItems = ['node_modules', 'Icon', 'package.json', 'package-lock.json', 'server.js'];
            return !hiddenItems.includes(path.basename(filename));
        },
    })
);



// Start the server
app.listen(PORT, () => {
    try {
        const ip = execSync('ipconfig getifaddr en0').toString().trim();
        const url = `http://${ip}:${PORT}`;

        const separator = '═'.repeat(50);
        const centerText = (text) => {
            const width = 50;
            const padding = Math.max(0, Math.floor((width - text.length) / 2));
            return ' '.repeat(padding) + text;
        };

        console.log(`\n${separator}`);
        console.log(centerText('📡 Local Sharing Server'));
        console.log(separator);

        console.log(`\n📂  File Browser     : ${url}`);
        console.log(`📤  Upload File      : ${url}/upload`);
        console.log(`📋  Clipboard Sync   : ${url}/clipboard\n`);

        console.log(centerText('📱  Scan with Your Phone'));
        console.log('   (make sure it’s on the same Wi-Fi)\n');

        console.log('🔗 File Browser');
        qrcode.generate(url, { small: true });

        console.log('\n🔗 File Upload');
        qrcode.generate(`${url}/upload`, { small: true });

        console.log('\n🔗 Clipboard');
        qrcode.generate(`${url}/clipboard`, { small: true });

        console.log(`\n${separator}\n`);
    } catch (error) {
        console.error('❌ Could not get IP address:', error);
    }
});

