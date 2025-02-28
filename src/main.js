import './main_style.css';
import { createMessage } from './message.js';
import { fetchAiStream, appendUserMessageToCtx } from './ai_api.js';

let isGenerating = false;

function fetchJSONSync(url) {
    try {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, false);  // sync request
        xhr.send();

        if (xhr.status !== 200) {
            throw new Error(`HTTP Error: ${xhr.status}`);
        }

        const data = JSON.parse(xhr.responseText);
        return data;
    } catch (error) {
        console.error('Error fetching JSON:', error);
        throw error;
    }
}

globalConfig = fetchJSONSync('./config.json');

function setGenerating() {
    isGenerating = true;
    document.getElementById('send-button').innerHTML = 'Generating...';
}

function unsetGenerating() {
    isGenerating = false;
    document.getElementById('send-button').innerHTML = 'Send';
}

let stopGenerating = false;

function resetStopGenerating() {
    stopGenerating = false;
}

function getStopGenerating() {
    return stopGenerating;
}

function sendMessage() {
    if (isGenerating) return;
    const input = document.getElementById('input-box');
    const message = input.value;
    if (message.trim() === '') {
        return;
    }
    let msgElem = createMessage(message, true);
    appendUserMessageToCtx(message);
    let container = document.getElementById('message-container');
    container.appendChild(msgElem);
    setGenerating();
    container.scrollTop = container.scrollHeight;
    input.value = '';
    fetchAiStream()
        .catch(error => {
            console.error('Error:', error);
        });
}

document.getElementById('model-name').textContent = globalConfig.model;

document.getElementById('input-box').addEventListener('keydown', function(event) {
    if (event.ctrlKey && event.key === 'Enter') {
        event.preventDefault();
        document.getElementById('send-button').click();
    }
});

document.getElementById('send-button').addEventListener('click', () => {
    sendMessage();
});

document.getElementById('stop-button').addEventListener('click', () => {
    if (isGenerating) {
        stopGenerating = true;
    }
});

export { unsetGenerating, getStopGenerating, resetStopGenerating};

