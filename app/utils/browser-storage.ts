import localforage from "localforage";

export type BrowserStorageType = 'local' | 'session' | 'indexdb';

export abstract class BrowserStorageAdapter {
  abstract get(key: string): Promise<string | null>
  abstract set(key: string, value: string): Promise<void>
  abstract clear(): Promise<void>
}

/**
 * The localStorage read-only property of the window interface allows you to access a Storage object for the Document's origin; the stored data is saved across browser sessions.

localStorage is similar to sessionStorage, except that while localStorage data has no expiration time, sessionStorage data gets cleared when the page session ends — that is, when the page is closed. (localStorage data for a document loaded in a "private browsing" or "incognito" session is cleared when the last "private" tab is closed.)
 */
export class LocalStorageAdapter implements BrowserStorageAdapter {
  async get(key: string) {
    return localStorage.getItem(key);
  }

  async set(key: string, value: string) {
    return localStorage.setItem(key, value);
  }

  async clear() {
    return localStorage.clear();
  }
}

/**
 * The read-only sessionStorage property accesses a session Storage object for the current origin. sessionStorage is similar to localStorage; the difference is that while data in localStorage doesn't expire, data in sessionStorage is cleared when the page session ends.

  Whenever a document is loaded in a particular tab in the browser, a unique page session gets created and assigned to that particular tab. That page session is valid only for that particular tab.
  A page session lasts as long as the tab or the browser is open, and survives over page reloads and restores.
  Opening a page in a new tab or window creates a new session with the value of the top-level browsing context, which differs from how session cookies work.
  Opening multiple tabs/windows with the same URL creates sessionStorage for each tab/window.
  Duplicating a tab copies the tab's sessionStorage into the new tab.
  Closing a tab/window ends the session and clears objects in sessionStorage.
 */
export class SessionStorageAdapter implements BrowserStorageAdapter {
  async get(key: string) {
    return sessionStorage.getItem(key);
  }

  async set(key: string, value: string) {
    return sessionStorage.setItem(key, value);
  }

  async clear() {
    return sessionStorage.clear();
  }
}

/**
 * In addition, be aware that browsers can wipe out the database, such as in the following conditions:

    The user requests a wipe out. Many browsers have settings that let users wipe all data stored for a given website, including cookies, bookmarks, stored passwords, and IndexedDB data.
    The browser is in private browsing mode. Some browsers, have "private browsing" (Firefox) or "incognito" (Chrome) modes. At the end of the session, the browser wipes out the database.
    The disk or quota limit has been reached.
    The data is corrupt.
    An incompatible change is made to the feature.
 */
export class IndexDBAdapter implements BrowserStorageAdapter {
  private db: LocalForage;

  constructor() {
    this.db = localforage.createInstance({
      name: "TSE",
      storeName: "TSE",
    });
  }

  async get(key: string) {
    const result = await this.db.getItem<string>(key);
    return result ? result : null;
  }

  async set(key: string, value: string) {
    await this.db.setItem(key, value);
  }

  async clear() {
    return await this.db.clear();
  }
}