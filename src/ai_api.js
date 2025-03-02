import { createMessage } from './message';
import { marked } from 'marked';
import { generationController, modelManager } from './main';
import { conversationManager } from './conversation';

function extractDelta(type, data) {
    if (type === 'openai') {
         return data.choices?.[0]?.delta?.content;
    } else if (type === 'claude') {
        if (data.type !== 'content_block_delta') return '';
        if (data.delta.type !== 'text_delta') return '';
        return data.delta.text;
    }
}

function isStop(type, rawData) {
    if (type === "openai") {
        return rawData === 'data: [DONE]';
    } else if (type === "claude") {
        return rawData === 'event: message_stop'
    }
}

let renderCnt = 0;

function shouldRender() {
    renderCnt++;
    if (renderCnt % 100 === 0) return true;
    return false;
}

function onStreamEvent(model, conversation, domElem, data, forceRender=false) {
    let deltaContent = extractDelta(model.type, data);
    if (deltaContent === undefined) deltaContent = '';
    conversation.currentMessage = conversation.currentMessage + deltaContent;
    if (!shouldRender() && !forceRender) return;
    renderMessage(domElem, conversation.currentMessage);
}

function renderMessage(domElem, message) {
    let container = document.getElementById('message-container');
    let shouldScroll = false;
    if (container.scrollTop + container.clientHeight >= container.scrollHeight - 100) {
        shouldScroll = true;
    }
    let renderContent = message.replace('<think>', '<div class="think">\n\n');
    renderContent = renderContent.replace('</think>', '\n\n</div>').trim();
    renderContent = renderContent 
        .replace(/(\\\[)([\s\S]*?)(\\\])/g, (match, p1, p2, p3) => {
            return `\$\$${p2.trim()}\$\$`;
        })
        .replace(/(\\\()([\s\S]*?)(\\\))/g, (match, p1, p2, p3) => {
            return `\\\\\\\(${p2.trim()}\\\\\\\)`;
        })
    const html = marked.parse(renderContent);
    domElem.innerHTML = html;
    if (shouldScroll) {
        container.scrollTop = container.scrollHeight;
    }
}

function onStreamEnd(model, conversation, domElem) {
    onStreamEvent(model, conversation, domElem, {}, true)
    conversation.addMessage(
        'assistant',
        conversation.currentMessage.replace(/<think>[\s\S]*?<\/think>/g, ''));
    conversation.currentMessage = '';
    generationController.unsetGenerating();
    MathJax.typesetPromise();
}

async function fetchAiStream() {
    let currentModel = modelManager.currentModel;
    let conversation = conversationManager.currentConversation;

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentModel.key}`
    };
    conversation.cleanContext(currentModel.ctxLen);
    const requestBody = {
        model: currentModel.model,
        messages: conversation.context,
        stream: true,
        max_tokens: currentModel.maxTokens,
    };
    let domElem = createMessage('', false);
    let container = document.getElementById('message-container');
    container.appendChild(domElem);
    container.scrollTop = container.scrollHeight;
    domElem.innerHTML = '<p>Generating...</p>';
    try {
        const response = await fetch(currentModel.url, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const decoder = new TextDecoder();
        const reader = response.body.getReader();
        let generationStarted = false;
        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                break;
            }
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            for (const line of lines) {
                if (!generationStarted) {
                    generationStarted = true;
                    domElem.innerHTML = '';
                }
                if (generationController.getStopGenerating()) {
                    generationController.resetStopGenerating();
                    onStreamEnd(currentModel, conversation, domElem);
                    return;
                }
                if (line === '') continue;
                if (isStop(currentModel.type, line.trim())) break;
                if (!line.startsWith('data: ')) {
                    continue;
                }
                try {
                    const data = JSON.parse(line.slice(6));
                    onStreamEvent(currentModel, conversation, domElem, data);
                } catch (e) {
                    console.error('Error parsing stream data:', e);
                }
            }
        }
        onStreamEnd(currentModel, conversation, domElem);
    } catch (error) {
        console.error('Error:', error);
        onStreamEnd(currentModel, conversation, domElem);
        domElem.appendChild(createErrorMsg(error));
        throw error;
    }
}

function createErrorMsg(error) {
    let p = document.createElement('p');
    p.innerHTML = error;
    p.style.color = 'red';
    return p;
}

export { fetchAiStream };
