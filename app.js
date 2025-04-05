const dbPromise = indexedDB.open('NotesDB', 1);
let db;
let editingKey = null;

dbPromise.onupgradeneeded = (event) => {
    db = event.target.result;
    db.createObjectStore('notes', { autoIncrement: true });
};

dbPromise.onsuccess = (event) => {
    db = event.target.result;
    loadNotes();
};

const noteInput = document.getElementById('note-input');
const addButton = document.getElementById('add-note');
const saveButton = document.getElementById('save-note');
const notesList = document.getElementById('notes-list');
const offlineStatus = document.getElementById('offline-status');
const noteView = document.getElementById('note-view');
const noteViewText = document.getElementById('note-view-text');
const closeViewButton = document.getElementById('close-view');

addButton.addEventListener('click', () => {
    const text = noteInput.value.trim();
    if (text && !editingKey) {
        const transaction = db.transaction(['notes'], 'readwrite');
        const store = transaction.objectStore('notes');
        store.add({ text, timestamp: new Date().toISOString() });
        
        transaction.oncomplete = () => {
            noteInput.value = '';
            loadNotes();
        };
    }
});

saveButton.addEventListener('click', () => {
    const text = noteInput.value.trim();
    if (text && editingKey !== null) {
        const transaction = db.transaction(['notes'], 'readwrite');
        const store = transaction.objectStore('notes');
        store.put({ text, timestamp: new Date().toISOString() }, editingKey);
        
        transaction.oncomplete = () => {
            noteInput.value = '';
            addButton.style.display = 'block';
            saveButton.style.display = 'none';
            editingKey = null;
            loadNotes();
        };
    }
});

function loadNotes() {
    notesList.innerHTML = '';
    const transaction = db.transaction(['notes'], 'readonly');
    const store = transaction.objectStore('notes');
    
    store.openCursor().onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
            const note = cursor.value;
            const li = document.createElement('li');
            li.className = 'note-item';
            li.innerHTML = `
                <span>${note.text.substring(0, 50)}${note.text.length > 50 ? '...' : ''}</span>
                <button onclick="editNote(${cursor.key})">edit</button>
                <button onclick="deleteNote(${cursor.key})">del</button>
            `;
            li.addEventListener('click', (e) => {
                if (e.target.tagName !== 'BUTTON') {
                    viewNote(note.text);
                }
            });
            notesList.appendChild(li);
            cursor.continue();
        }
    };
}

function deleteNote(key) {
    const transaction = db.transaction(['notes'], 'readwrite');
    const store = transaction.objectStore('notes');
    store.delete(key);
    
    transaction.oncomplete = () => {
        loadNotes();
    };
}

function editNote(key) {
    const transaction = db.transaction(['notes'], 'readonly');
    const store = transaction.objectStore('notes');
    const request = store.get(key);
    
    request.onsuccess = () => {
        noteInput.value = request.result.text;
        editingKey = key;
        addButton.style.display = 'none';
        saveButton.style.display = 'block';
    };
}

function viewNote(text) {
    noteViewText.textContent = text;
    noteView.className = 'note-view-visible';
}

closeViewButton.addEventListener('click', () => {
    noteView.className = 'note-view-hidden';
});

window.addEventListener('online', updateOfflineStatus);
window.addEventListener('offline', updateOfflineStatus);

function updateOfflineStatus() {
    offlineStatus.className = navigator.onLine ? 'offline-hidden' : 'offline-visible';
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js');
    });
}