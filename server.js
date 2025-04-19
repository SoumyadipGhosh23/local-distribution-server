const express = require('express');
const serveIndex = require('serve-index');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const QRCode = require('qrcode');
const {upload} = require('./middleware/multer.js');


const app = express();
const PORT = 8000;

let clipboardHistory = [];
let latestClipFromPhone = []


const dropFolder = path.join(os.homedir(), 'Downloads');
// Serve file browser
app.use(
    "/file-browse",
    express.static(dropFolder),
    serveIndex(dropFolder, {
        icons: true,
        filter: (filename) => {
            const hiddenItems = ["node_modules", "Icon", "package.json", "package-lock.json", "server.js"];
            return !hiddenItems.includes(path.basename(filename));
        },
    })
);

// Static files serve
app.use('/static', express.static(path.join(__dirname, 'QRCodes')));
app.use('/static', express.static(path.join(__dirname, 'SystemRoutes')));

// Set EJS as your view engine
app.set('view engine', 'ejs');


app.set('views', [
    path.join(__dirname, 'SystemRoutes'),
    path.join(__dirname, 'QRCodes')
]);




// Main Views

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


app.get('/upload', (req, res) => {
    res.sendFile(path.join(__dirname, 'SystemRoutes', 'upload.html'));
});


app.post('/upload', upload.array('file', 12), (req, res) => {
    const fileNames = req.files.map(file => file.originalname); // Use original name for display
    res.render('upload-success', { fileNames });
});




//mac QR codes

app.get('/qr/file-browse', (req, res) => {
    res.sendFile(path.join(`${__dirname}/QRCodes`, 'file-browse.html'));
});

app.get('/qr/upload', (req, res) => {
    res.sendFile(path.join(`${__dirname}/QRCodes`, 'upload.html'));
});

app.get('/qr/clipboard', (req, res) => {
    res.render('clipboard', { latestClipFromPhone });
});



// Handler Files

// Handles user input from the manual clipboard textbox
app.post('/clipboard', express.urlencoded({ extended: true }), (req, res) => {
    const clip = req.body.clip;
    if (clip) {
        latestClipFromPhone.push(clip)
    }
    res.redirect('/clipboard');
});

//handles the QR code generation
app.get('/qrcode', async (req, res) => {
    const { url } = req.query;
    const domain = req.rawHeaders[1];

    if (!url) {
        return res.status(400).send('URL parameter is required');
    }

    try {
        // Check if the URL is provided, and use a default if not
        const qrUrl = `http://${domain}/${url}`; // Use the root if no URL is provided
        const qr = await QRCode.toDataURL(qrUrl);
        const base64Data = qr.replace(/^data:image\/png;base64,/, "");
        const imgBuffer = Buffer.from(base64Data, 'base64');

        res.setHeader('Content-Type', 'image/png');
        res.send(imgBuffer);
    } catch (err) {
        res.status(500).send('QR generation error');
    }
});




// Start the server
app.listen(PORT, async () => {
    try {
        const { default: open } = await import('open');
        const ip = execSync('ipconfig getifaddr en0').toString().trim();
        const url = `http://${ip}:${PORT}`;
        const feature = process.argv[2] || 'clipboard';

        const separator = '═'.repeat(60);
        const centerText = (text) => {
            const width = 60;
            const padding = Math.max(0, Math.floor((width - text.length) / 2));
            return ' '.repeat(padding) + text;
        };

        console.log();

        console.log(centerText('🚀 Local File Sharing Server'));

        console.log(`\n🌐 IP Address: ${ip}`);
        console.log(`🔌 Port      : ${PORT}`);
        console.log(`📦 Feature   : ${feature}\n`);


        // Open dashboard in default browser
        if (feature === 'browser') {
            await open(`${url}/qr/file-browse`);
        }
        if (feature === 'upload') {
            await open(`${url}/qr/upload`);
        }
        if (feature === 'clipboard') {
            await open(`${url}/qr/clipboard`);
        }

    } catch (error) {
        console.error('❌ Could not get IP address or open browser:', error);
    }
});
