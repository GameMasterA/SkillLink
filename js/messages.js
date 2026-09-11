/**
 * SkillLink — Central Messaging Engine (js/messages.js)
 * Manages real-time multi-user chat streams across Client and Freelancer dashboards.
 */

let activeConversationId = null;

document.addEventListener("DOMContentLoaded", () => {
    initMessagingEngine();
});

function initMessagingEngine() {
    const chatContainer = document.getElementById("chatInterfaceContainer");
    if (!chatContainer) return;

    renderConversationList();

    const sendForm = document.getElementById("sendMessageForm");
    if (sendForm) {
        sendForm.addEventListener("submit", handleSendMessageSubmit);
    }
}

function getActiveUser() {
    if (typeof getCurrentUser === "function") {
        return getCurrentUser();
    }
    return JSON.parse(localStorage.getItem("skillLinkUser")) || { id: "usr-demo-fl", name: "John Doe" };
}

function renderConversationList() {
    const listContainer = document.getElementById("conversationsList");
    if (!listContainer) return;

    const conversations = typeof getStoredMessages === "function" ? getStoredMessages() : [];
    const activeUser = getActiveUser();

    if (conversations.length === 0) {
        listContainer.innerHTML = `<div style="padding:20px; text-align:center; color:var(--text-muted);">No active conversations yet.</div>`;
        return;
    }

    if (!activeConversationId && conversations.length > 0) {
        activeConversationId = conversations[0].conversationId;
    }

    listContainer.innerHTML = conversations.map(conv => {
        const otherParticipant = conv.participants.find(p => p.id !== activeUser.id) || conv.participants[0];
        const isActive = conv.conversationId === activeConversationId;

        return `
            <div class="conversation-item ${isActive ? 'active' : ''}" onclick="selectConversation('${conv.conversationId}')" style="padding:14px; border-bottom:1px solid rgba(255,255,255,0.4); cursor:pointer; background:${isActive ? 'rgba(2,132,199,0.12)' : 'transparent'}; border-radius:12px; transition:0.2s;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong style="color:var(--text-dark); font-size:14px;">${otherParticipant.name}</strong>
                    <span style="font-size:11px; color:var(--text-light);">${conv.lastTimestamp || ''}</span>
                </div>
                <p style="font-size:12px; color:var(--text-muted); margin-top:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                    ${conv.lastMessage || 'Start conversation...'}
                </p>
            </div>
        `;
    }).join("");

    renderChatThread();
}

function selectConversation(convId) {
    activeConversationId = convId;
    renderConversationList();
}

function renderChatThread() {
    const messagesBody = document.getElementById("chatMessagesBody");
    const headerTitle = document.getElementById("chatHeaderTitle");
    if (!messagesBody) return;

    const conversations = typeof getStoredMessages === "function" ? getStoredMessages() : [];
    const activeUser = getActiveUser();
    const conv = conversations.find(c => c.conversationId === activeConversationId);

    if (!conv) {
        messagesBody.innerHTML = `<div style="padding:40px; text-align:center; color:var(--text-muted);">Select a conversation to start chatting.</div>`;
        if (headerTitle) headerTitle.textContent = "Chat";
        return;
    }

    const otherParticipant = conv.participants.find(p => p.id !== activeUser.id) || conv.participants[0];
    if (headerTitle) headerTitle.textContent = otherParticipant.name;

    messagesBody.innerHTML = conv.messages.map(msg => {
        const isMe = msg.senderId === activeUser.id;
        return `
            <div style="display:flex; flex-direction:column; align-items:${isMe ? 'flex-end' : 'flex-start'}; margin-bottom:14px;">
                <div style="max-width:75%; padding:12px 18px; border-radius:${isMe ? '18px 18px 2px 18px' : '18px 18px 18px 2px'}; background:${isMe ? 'linear-gradient(135deg, var(--primary), var(--accent-blue))' : 'rgba(255,255,255,0.9)'}; color:${isMe ? '#ffffff' : 'var(--text-dark)'}; font-size:14px; box-shadow: 0 4px 14px rgba(0,0,0,0.04);">
                    ${msg.text}
                </div>
                <span style="font-size:11px; color:var(--text-light); margin-top:4px; padding:0 4px;">${msg.timestamp}</span>
            </div>
        `;
    }).join("");

    messagesBody.scrollTop = messagesBody.scrollHeight;
}

function handleSendMessageSubmit(e) {
    e.preventDefault();
    const input = document.getElementById("chatInput");
    if (!input || !input.value.trim() || !activeConversationId) return;

    const text = input.value.trim();
    const activeUser = getActiveUser();
    const conversations = typeof getStoredMessages === "function" ? getStoredMessages() : [];

    const convIndex = conversations.findIndex(c => c.conversationId === activeConversationId);
    if (convIndex !== -1) {
        const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const newMessage = {
            id: "m-" + Date.now(),
            senderId: activeUser.id,
            text: text,
            timestamp: timeNow
        };

        conversations[convIndex].messages.push(newMessage);
        conversations[convIndex].lastMessage = text;
        conversations[convIndex].lastTimestamp = timeNow;

        if (typeof saveStoredMessages === "function") {
            saveStoredMessages(conversations);
        }

        input.value = "";
        renderChatThread();
        renderConversationList();
    }
}

// Global scope exports
window.selectConversation = selectConversation;
window.renderConversationList = renderConversationList;
