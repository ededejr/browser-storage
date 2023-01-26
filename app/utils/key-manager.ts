import type { BrowserStorageAdapter, BrowserStorageType} from "./browser-storage";
import { IndexDBAdapter, LocalStorageAdapter, SessionStorageAdapter } from "./browser-storage";
import { useLogStore, usePageContextStore } from "./store";

export class KeyManager {
  private log = useLogStore.getState().addLog;
  private encoder = new TextEncoder();
  private keys: CryptoKeyPair | undefined;
  private storageAdapters: Record<BrowserStorageType, BrowserStorageAdapter>;
  private storage: BrowserStorageAdapter;

  constructor() {
    this.storageAdapters = {
      local: new LocalStorageAdapter(),
      session: new SessionStorageAdapter(),
      indexdb: new IndexDBAdapter()
    };

    this.storage = this.storageAdapters.session;

    usePageContextStore.subscribe(
      state => state.storageType, 
      (storageType) => {
        this.log(`switching storage to "${storageType}"`);
        this.storage = this.storageAdapters[storageType];
        this.log('clearing keys in memory');
        this.keys = undefined;
        this.log(`Using "${storageType}" storage`);
        this.setPublicKeyState();
      }, {
        equalityFn: (a, b) => a === b
      });
  }

  async setPublicKeyState() {    
    // Attempt to import keys on disk
    if (!this.keys?.publicKey) {
      await this.importKeys();
    }

    // If still no keys on disk, remove from page context
    if (!this.keys?.publicKey) {
      usePageContextStore.setState({ publicKey: undefined });
      return null;
    }

    let publicKey;

    if (this.IsUsingIndexDB) {
      publicKey = `The public key is stored in the browser's IndexedDB. It is not available to the page context. You can view it in the browser's IndexedDB inspector.`;
    } else {
      const exported = await crypto.subtle.exportKey('jwk', this.keys.publicKey);
      const exportedAsString = JSON.stringify(exported);
      const exportedAsBase64 = btoa(exportedAsString);
      publicKey = exportedAsBase64;
    }

    usePageContextStore.setState({ publicKey });
  }
 
  async generateKey() {
    await this.importKeys();

    if (this.keys) {
      return this.keys;
    }
    
    const genKeyTask = this.createTask('generate key');
    const pair = await crypto.subtle.generateKey(
      {
        name: "ECDSA",
        namedCurve: "P-384"
      },
      this.IsUsingIndexDB ? false : true,
      ["sign", "verify"]
    );
    this.keys = pair;
    await this.exportKeys();
    await this.setPublicKeyState();
    genKeyTask.stop();
    return pair;
  }

  async sign(text: string) {
    if (!this.keys?.privateKey) {
      throw new Error("Private Key not generated");
    }

    const task = this.createTask(`sign "${text}"`);
    const encoded = this.encoder.encode(text);
    const signature = await crypto.subtle.sign(
      {
        name: "ECDSA",
        hash: { name: "SHA-384" }
      },
      this.keys.privateKey,
      encoded
    );
    const buffer = new Uint8Array(signature, 0, 5);
    const signatureText = `${signature.byteLength} bytes:\n\n${new TextDecoder("utf-8").decode(buffer)}`;
    task.stop();
    return { signatureText, signature, buffer, encoded }
  }

  async verify(encoded: BufferSource, signature: BufferSource) {
    if (!this.keys?.publicKey) {
      throw new Error("Public Key not generated");
    }

    const task = this.createTask('verify');
    const isVerified = await crypto.subtle.verify(
      {
        name: "ECDSA",
        hash: { name: "SHA-384" }
      },
      this.keys.publicKey,
      signature,
      encoded
    );
    task.stop();
    return isVerified;
  }

  async clear() {
    this.log('clearing keys in memory');
    this.keys = undefined;
    this.log('wiping storage');
    await this.storage.clear();
    this.log('wiped storage');
    usePageContextStore.setState({ publicKey: undefined });
  }

  private async importKeys() {
    const task = this.createTask('import keys');
    const [maybePublicKey, maybePrivateKey] = await Promise.all([
      this.storage.get("TSE:public:key"),
      this.storage.get("TSE:private:key")
    ]);
    
    if (maybePublicKey && maybePrivateKey) {
      this.log('found keys locally');

      let publicKey: CryptoKey;
      let privateKey: CryptoKey;

      if (typeof maybePublicKey === 'string' && typeof maybePrivateKey === 'string') {
        publicKey = await crypto.subtle.importKey(
          "jwk",
          JSON.parse(maybePublicKey),
          {
            name: "ECDSA",
            namedCurve: "P-384"
          },
          true,
          ["verify"]
        );
        
        privateKey = await crypto.subtle.importKey(
          "jwk",
          JSON.parse(maybePrivateKey),
          {
            name: "ECDSA",
            namedCurve: "P-384"
          },
          true,
          ["sign"]
        );
      } else if (maybePublicKey instanceof CryptoKey && maybePrivateKey instanceof CryptoKey) {
        publicKey = maybePublicKey;
        privateKey = maybePrivateKey;
      } else {
        throw new Error("Invalid key type");
      }
      this.keys = { publicKey, privateKey };
      this.log('imported');
    } else {
      this.log('no keys found locally');
    }
    task.stop();
  }

  private async exportKeys() {
    if (this.keys) {
      const task = this.createTask('export keys');
      
      if (this.IsUsingIndexDB) {
        await Promise.all([
          this.storage.set("TSE:public:key", this.keys.publicKey),
          this.storage.set("TSE:private:key", this.keys.privateKey),
        ]);
      } else {
        const publicKeyExport = await crypto.subtle.exportKey("jwk", this.keys.publicKey);
        const privateKeyExport = await crypto.subtle.exportKey("jwk", this.keys.privateKey);
        
        await Promise.all([
          this.storage.set("TSE:public:key", JSON.stringify(publicKeyExport)),
          this.storage.set("TSE:private:key", JSON.stringify(privateKeyExport))
        ]);
      }

      task.stop();
    }
  }

  private createTask(name: string): { stop: () => void } {
    const start = performance.now();
    this.log(`start: ${name}`)
    return {
      stop: () => {
        const end = performance.now();
        this.log(`end: ${name} (${end - start}ms)`);
      }
    };
  }

  private get IsUsingIndexDB() {
    return this.storage instanceof IndexDBAdapter;
  }
}