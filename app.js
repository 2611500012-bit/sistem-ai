const chat = document.getElementById("chat");
const input = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");
const welcome = document.getElementById("welcome");
const historyBox = document.getElementById("history");

let messages = [];


// ================================
// LOAD DATA
// ================================

const savedMessages =
    localStorage.getItem("indra_messages");

if (savedMessages) {

    try {

        messages =
            JSON.parse(savedMessages);

        if (messages.length > 0) {

            welcome.style.display = "none";

            messages.forEach(message => {

                renderMessage(
                    message.role,
                    message.content
                );

            });

        }

    } catch {

        messages = [];

    }

}

loadHistory();


// ================================
// SEND MESSAGE
// ================================

async function sendMessage() {

    const text =
        input.value.trim();

    if (!text || sendButton.disabled) {
        return;
    }


    welcome.style.display = "none";


    // Tambahkan pesan user
    addMessage(
        "user",
        text
    );


    input.value = "";

    autoResize();

    sendButton.disabled = true;

    showTyping();


    try {

        // ================================
        // CONNECT TO CLOUDFLARE
        // ================================

        const response = await fetch(
            "https://indra-ai.2611500012.workers.dev/",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    messages: messages
                })
            }
        );


        // ================================
        // CHECK RESPONSE
        // ================================

        if (!response.ok) {

            const errorText =
                await response.text();

            throw new Error(
                `Server ${response.status}: ${errorText}`
            );

        }


        if (!response.body) {

            throw new Error(
                "Streaming tidak didukung oleh browser."
            );

        }


        // Hapus animasi typing
        removeTyping();


        // ================================
        // BUAT PESAN AI KOSONG
        // ================================

        const assistantMessage = {

            role: "assistant",

            content: ""

        };

        messages.push(
            assistantMessage
        );


        // ================================
        // BUAT BUBBLE AI
        // ================================

        const row =
            document.createElement("div");

        row.className =
            "message-row assistant";


        const avatar =
            document.createElement("div");

        avatar.className =
            "message-avatar";

        avatar.textContent = "I";


        const messageElement =
            document.createElement("div");

        messageElement.className =
            "message-content";

        messageElement.textContent = "";


        row.appendChild(avatar);

        row.appendChild(messageElement);

        chat.appendChild(row);


        chat.scrollTop =
            chat.scrollHeight;


        // ================================
        // READ STREAM
        // ================================

        const reader =
            response.body.getReader();

        const decoder =
            new TextDecoder("utf-8");


        let buffer = "";


        while (true) {

            const {
                value,
                done
            } = await reader.read();


            if (done) {
                break;
            }


            buffer +=
                decoder.decode(
                    value,
                    {
                        stream: true
                    }
                );


            const lines =
                buffer.split("\n");


            buffer =
                lines.pop() || "";


            // ================================
            // PROCESS STREAM
            // ================================

            for (const line of lines) {

                const trimmed =
                    line.trim();


                if (!trimmed) {
                    continue;
                }


                if (
                    !trimmed.startsWith("data:")
                ) {
                    continue;
                }


                const data =
                    trimmed
                        .substring(5)
                        .trim();


                if (
                    data === "[DONE]"
                ) {
                    continue;
                }


                try {

                    const json =
                        JSON.parse(data);


                    let chunk = "";


                    // Format Workers AI
                    if (
                        typeof json.response ===
                        "string"
                    ) {

                        chunk =
                            json.response;

                    }


                    // Format lain
                    else if (
                        json.response &&
                        typeof json.response.text ===
                        "string"
                    ) {

                        chunk =
                            json.response.text;

                    }


                    // OpenAI-style format
                    else if (
                        json.choices &&
                        json.choices[0]
                    ) {

                        const delta =
                            json.choices[0].delta;


                        if (
                            delta &&
                            typeof delta.content ===
                            "string"
                        ) {

                            chunk =
                                delta.content;

                        }

                    }


                    // ================================
                    // DISPLAY CHUNK
                    // ================================

                    if (chunk) {

                        assistantMessage.content +=
                            chunk;


                        messageElement.textContent =
                            assistantMessage.content;


                        chat.scrollTop =
                            chat.scrollHeight;

                    }


                } catch {

                    // Abaikan potongan
                    // yang bukan JSON

                }

            }

        }


        // ================================
        // SAVE FINAL MESSAGE
        // ================================

        saveMessages();

        updateHistory();


    } catch (error) {


        removeTyping();


        addMessage(
            "assistant",

            "Maaf, terjadi kesalahan.\n\n" +
            error.message
        );


    } finally {

        sendButton.disabled = false;

        input.focus();

    }

}


// ================================
// ADD MESSAGE
// ================================

function addMessage(
    role,
    content
) {

    messages.push({

        role: role,

        content: content

    });


    saveMessages();


    renderMessage(
        role,
        content
    );


    chat.scrollTop =
        chat.scrollHeight;


    updateHistory();

}


// ================================
// RENDER
// ================================

function renderMessage(
    role,
    content
) {

    const row =
        document.createElement("div");


    row.className =
        "message-row " +
        (
            role === "user"
                ? "user"
                : "assistant"
        );


    const avatar =
        document.createElement("div");


    avatar.className =
        "message-avatar";


    avatar.textContent =
        role === "user"
            ? "U"
            : "I";


    const message =
        document.createElement("div");


    message.className =
        "message-content";


    message.textContent =
        content;


    if (role === "user") {

        row.appendChild(message);

        row.appendChild(avatar);

    } else {

        row.appendChild(avatar);

        row.appendChild(message);

    }


    chat.appendChild(row);

}


// ================================
// TYPING
// ================================

function showTyping() {

    const row =
        document.createElement("div");


    row.id = "typing";


    row.className =
        "message-row assistant";


    row.innerHTML = `

        <div class="message-avatar">
            I
        </div>

        <div class="typing">

            <span></span>
            <span></span>
            <span></span>

        </div>

    `;


    chat.appendChild(row);


    chat.scrollTop =
        chat.scrollHeight;

}


// ================================
// REMOVE TYPING
// ================================

function removeTyping() {

    const typing =
        document.getElementById(
            "typing"
        );


    if (typing) {

        typing.remove();

    }

}


// ================================
// NEW CHAT
// ================================

function newChat() {

    messages = [];


    localStorage.removeItem(
        "indra_messages"
    );


    chat.innerHTML = "";


    chat.appendChild(
        welcome
    );


    welcome.style.display =
        "block";


    updateHistory();

}


// ================================
// CLEAR CHAT
// ================================

function clearChat() {

    if (
        !confirm(
            "Hapus seluruh percakapan?"
        )
    ) {

        return;

    }


    newChat();

}


// ================================
// SUGGESTION
// ================================

function useSuggestion(text) {

    input.value = text;

    autoResize();

    input.focus();

}


// ================================
// ENTER
// ================================

input.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {

            event.preventDefault();

            sendMessage();

        }

    }
);


// ================================
// AUTO RESIZE
// ================================

input.addEventListener(
    "input",
    autoResize
);


function autoResize() {

    input.style.height =
        "auto";


    input.style.height =
        Math.min(
            input.scrollHeight,
            150
        ) + "px";

}


// ================================
// LOCAL STORAGE
// ================================

function saveMessages() {

    localStorage.setItem(
        "indra_messages",

        JSON.stringify(
            messages
        )
    );

}


// ================================
// HISTORY
// ================================

function loadHistory() {

    updateHistory();

}


function updateHistory() {

    historyBox.innerHTML =
        "";


    if (messages.length === 0) {

        const empty =
            document.createElement(
                "div"
            );


        empty.style.color =
            "var(--muted)";


        empty.style.fontSize =
            "12px";


        empty.style.padding =
            "10px";


        empty.textContent =
            "Belum ada percakapan";


        historyBox.appendChild(
            empty
        );


        return;

    }


    const userMessages =
        messages.filter(
            m => m.role === "user"
        );


    userMessages
        .slice(-20)
        .reverse()
        .forEach(message => {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "history-item";


            item.textContent =
                message.content;


            historyBox.appendChild(
                item
            );

        });

}


// ================================
// THEME
// ================================

function toggleTheme() {

    document.body.classList.toggle(
        "light"
    );


    localStorage.setItem(

        "indra_theme",

        document.body.classList.contains(
            "light"
        )
            ? "light"
            : "dark"

    );

}


// ================================
// LOAD THEME
// ================================

const savedTheme =
    localStorage.getItem(
        "indra_theme"
    );


if (
    savedTheme === "light"
) {

    document.body.classList.add(
        "light"
    );

}
