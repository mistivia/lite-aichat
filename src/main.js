import './style.css';

import { createMessage } from './message.js';
import { fetchAiStream } from './ai_api.js';
import { conversationManager } from './conversation';
import utils from './utils';

export { generationController, modelManager };


let isGenerating = false;
let stopGenerating = false;

let generationController = {
    setGenerating: () => {
        isGenerating = true;
        document.getElementById('send-button').innerHTML = 'Generating...';
    },
    unsetGenerating: () => {
        isGenerating = false;
        document.getElementById('send-button').innerHTML = 'Send';
    },
    resetStopGenerating: () => {
        stopGenerating = false;
    },
    getStopGenerating: () => {
        return stopGenerating;
    }
};

function sanitizeGlobalConfig(config) {
    for (let key in config) {
        if (config[key]["type"] === undefined) {
            config[key].type = 'openai';
        }
        if (config[key]["ctxLen"] === undefined) {
            config[key]["ctxLen"] = 100000;
        }
        if (config[key]["maxTokens"] === undefined) {
            config[key]["maxTokens"] = 10000;
        }
    }
    return config;
}

function buildModelSelector(config) {
    let modelSelector = document.getElementById('model-selector');
    let modelKeys = Object.keys(config).sort((a, b) => a.localeCompare(b));
    for (let key of modelKeys) {
        let option = document.createElement('option');
        option.value = key;
        option.text = key;
        modelSelector.add(option);
    }
    if (localStorage.getItem('lite-aichat-model') !== null) {
        modelSelector.value = localStorage.getItem('lite-aichat-model');
    }
}

let ModelManager = () => {
    let self = {
        config: {},
        currentModel: '',
        init: () => {
            let modelSelector = document.getElementById('model-selector');
            self.config = utils.noCacheSyncJsonFetch('./config.json');
            self.config = sanitizeGlobalConfig(self.config);
            buildModelSelector(self.config);
            self.currentModel = self.config[modelSelector.value];
        },
        setModel: (modelKey) => {
            let modelSelector = document.getElementById('model-selector');
            self.currentModel = self.config[modelKey];
            localStorage.setItem('lite-aichat-model', modelSelector.value);
        },
    };
    self.init();
    return self;
};

let modelManager = ModelManager();

document.getElementById('model-selector').addEventListener('change', function() {
    let modelSelector = document.getElementById('model-selector');
    modelManager.setModel(modelSelector.value);;
});


function sendMessage() {
    if (isGenerating) return;
    const input = document.getElementById('input-box');
    const message = input.value;
    if (message.trim() === '') {
        return;
    }
    let msgElem = createMessage(message, true);
    conversationManager.currentConversation.addMessage('user', message);
    let container = document.getElementById('message-container');
    container.appendChild(msgElem);
    generationController.setGenerating();
    container.scrollTop = container.scrollHeight;
    input.value = '';
    fetchAiStream()
        .catch(error => {
            console.error('Error:', error);
        });
}


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


