#!/usr/bin/env node

const inquirer = require('inquirer');
const { spawn } = require('child_process');

inquirer
    .prompt([
        {
            type: 'list',
            name: 'feature',
            message: '🚀 Which feature do you want to launch?',
            choices: [
                { name: '📂  File Browser', value: 'browser' },
                { name: '📤  File Upload', value: 'upload' },
                { name: '📋  Clipboard Sync', value: 'clipboard' },
            ],
        },
    ])
    .then((answers) => {
        const args = [answers.feature];
        const child = spawn('node', ['server.js', ...args], { stdio: 'inherit' });

        child.on('error', (err) => {
            console.error('❌ Failed to start server:', err);
        });
    });
