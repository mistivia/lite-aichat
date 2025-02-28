import { createMessage } from './message';
import { marked } from 'marked';
import { unsetGenerating, getStopGenerating, resetStopGenerating } from './main';

let context = [];
let currentMessage = '';

function appendUserMessageToCtx(msg) {
    context.push({
        role: 'user',
        content: msg,
    });
}

function onStreamEvent(elem, data) {
    let container = document.getElementById('message-container');
    let shouldScroll = false;
    if (container.scrollTop + container.clientHeight >= container.scrollHeight - 100) {
        shouldScroll = true;
    }

    let deltaContent = data.choices?.[0]?.delta?.content;
    if (deltaContent === undefined) deltaContent = '';
    currentMessage = currentMessage + deltaContent;
    let renderContent = currentMessage.replace('<think>', '<div class="think">\n\n');
    renderContent = renderContent.replace('</think>', '\n\n</div>').trim();
    renderContent = renderContent 
        .replace(/(\\\[)([\s\S]*?)(\\\])/g, (match, p1, p2, p3) => {
            return `\$\$${p2.trim()}\$\$`;
        })
        .replace(/(\\\()([\s\S]*?)(\\\))/g, (match, p1, p2, p3) => {
            return `\$${p2.trim()}\$`;
        })
    const html = marked.parse(renderContent);
    elem.innerHTML = html;
    if (shouldScroll) {
        container.scrollTop = container.scrollHeight;
    }
}

function onStreamEnd() {
    context.push({
        role: 'assistant',
        content: currentMessage.replace(/<think>[\s\S]*?<\/think>/g, ''),
    });
    currentMessage = '';
    unsetGenerating();
    MathJax.typesetPromise();
}

async function fetchAiStream() {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${globalConfig.key}`
    };
    const requestBody = {
        model: globalConfig.model,
        messages: context,
        stream: true
    };
    let elem = createMessage('', false);
    let container = document.getElementById('message-container');
    container.appendChild(elem);
    container.scrollTop = container.scrollHeight;
    try {
        const response = await fetch(globalConfig.url, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody)
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const decoder = new TextDecoder();
        const reader = response.body.getReader();
        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                break;
            }
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            for (const line of lines) {
                if (getStopGenerating()) {
                    resetStopGenerating();
                    onStreamEnd();
                    return;
                }
                if (line === '') continue;
                if (line.trim() === 'data: [DONE]') break;
                try {
                    const data = JSON.parse(line.slice(6));
                    onStreamEvent(elem, data);
                } catch (e) {
                    console.error('Error parsing stream data:', e);
                }
            }
        }
        onStreamEnd();
    } catch (error) {
        console.error('Error:', error);
        let p = document.createElement('p');
        p.innerHTML = error;
        p.style.color = 'red';
        elem.appendChild(p);
        throw error;
    }
}

export { appendUserMessageToCtx, fetchAiStream };
