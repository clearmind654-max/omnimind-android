/**
 * OmniMind Folder & Tag Manager
 */

import { Storage } from './storage.js';

const STORAGE_KEY = 'omnimind_folders_v2';

export const DEFAULT_FOLDERS = [
    { id: 'folder_all', name: 'All Chats', colorHex: '#007AFF' },
    { id: 'folder_work', name: 'Work & Code', colorHex: '#8E44AD' },
    { id: 'folder_personal', name: 'Personal & Ideas', colorHex: '#2ECC71' }
];

export class FolderManager {
    constructor() {
        this.folders = [];
        this.activeFolderId = 'folder_all';
    }

    async init() {
        const saved = await Storage.getItem(STORAGE_KEY, null);
        if (saved && Array.isArray(saved) && saved.length > 0) {
            this.folders = saved;
        } else {
            this.folders = [...DEFAULT_FOLDERS];
            await this.save();
        }
    }

    async save() {
        await Storage.setItem(STORAGE_KEY, this.folders);
    }

    getAll() {
        return this.folders;
    }

    async addFolder(name, colorHex = '#007AFF') {
        const folder = {
            id: `folder_${Date.now()}`,
            name,
            colorHex
        };
        this.folders.push(folder);
        await this.save();
        return folder;
    }
}
