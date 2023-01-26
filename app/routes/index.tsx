import type { ButtonHTMLAttributes, DetailedHTMLProps, HTMLProps} from "react";
import { createContext, useContext} from "react";
import { useEffect} from "react";
import { useCallback} from "react";
import { useRef, useState } from "react";
import { cn } from "~/utils/cn";
import { KeyManager } from "~/utils/key-manager";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/AlertDialog"
import { useLogStore, usePageContextStore } from "~/utils/store";
import { Logs } from "~/components/Logs";
import { Tabs, TabsList, TabsTrigger } from "~/components/Tabs";
import { Key, Trash } from "lucide-react";
import { AlertDialogTrigger } from "@radix-ui/react-alert-dialog";

interface Locals {
  isInitialized: boolean;
  signature?: ArrayBuffer, 
  encoded?: BufferSource 
}

const PageContext = createContext<{keyManager: KeyManager} | null>(null);

function usePageContext() {
  const context = useContext(PageContext);

  if (!context) {
    throw new Error("usePageContext must be used within a PageContext.Provider");
  }

  return context;
};

export default function PageWithContext() {
  const keyManager = new KeyManager();
  return (
    <PageContext.Provider value={{ keyManager: keyManager }}>
      <Page />
    </PageContext.Provider>
  );
}

function Page() {
  const locals = useRef<Locals>({
    isInitialized: false,
  });
  const keyManager = usePageContext().keyManager;
  const [text, setText] = useState("");
  const [alertContent, setAlertContent] = useState<SimplifiedAlertProps | null>(null);

  useEffect(() => {
    if (locals.current.isInitialized) {
      return;
    }
    const storageType = usePageContextStore.getState().storageType;
    useLogStore.getState().addLog(`using "${storageType}" storage`);
    locals.current.isInitialized = true;
  }, []);

  const sign = useCallback(async () => {
    await keyManager.generateKey();
    const { signatureText, signature, encoded } = await keyManager.sign(text);
    locals.current.signature = signature;
    locals.current.encoded = encoded;
    setText(signatureText);
  }, [text, keyManager]);

  const verify = useCallback(async () => {
    if (locals.current.signature && locals.current.encoded) {
      const isVerified = await keyManager.verify(locals.current.encoded, locals.current.signature);

      const base = {
        title: '',
        description: '',
        cancel: {
          onClick: () => setAlertContent(null),
          text: 'Close'
        },
        action: {
          onClick: () => {
            setAlertContent(null);
            setText("");
            locals.current.signature = undefined;
            locals.current.encoded = undefined;
          },
          text: 'Reset'
        }
      }
      
      if (isVerified) {
        base.title = 'Verification Successful';
        base.description = 'The signature is valid based on the public key';
      } else {
        base.title = 'Verification Failed';
        base.description = 'The signature could not be verified';
      }

      setAlertContent(base);
    } else {
      setAlertContent({
        title: 'Error: No content to verify',
        description: 'Please sign a message first',
        cancel: { onClick: () => {}, text: 'Close' },
      });
    }
  }, [keyManager]);

  const clearKeys = useCallback(async () => {
    setAlertContent({
      title: 'Wipe Keys',
      description: 'Are you sure you want to wipe the keys? This will remove the keys from memory and browser storage.',
      cancel: { onClick: () => setAlertContent(null), text: 'Cancel' },
      action: { onClick: async () => {
        await keyManager.clear();
        locals.current.signature = undefined;
        locals.current.encoded = undefined;
        setText("");
        setAlertContent(null);
      }, text: 'Continue' }
    })
  }, [keyManager]);

  return (
    <main className="mx-auto h-screen flex items-center flex-col justify-center bg-neutral-200 dark:bg-neutral-900">
      <div className="w-full max-w-2xl px-4 lg:px-0">
        <div className="my-4 w-full">
          <StorageSelectionTabs />
        </div>
        
        <div className="flex flex-row flex-nowrap gap-2 items-center justify-center relative my-4">
          <div className="relative flex-grow">
            <div className="absolute top-2 right-2">
              <div className="flex flex-row gap-1 flex-nowrap">
                <PublicKeyDialog />
                <IconButton onClick={clearKeys}>
                  <Trash  className="w-4 h-4" />
                </IconButton>
              </div>
            </div>
            <Logs />
          </div>
        </div>

        <TextArea 
            value={text}
            disabled={Boolean(locals.current.signature)}
            onInput={(e) => setText(e.currentTarget.value)}
            placeholder="Enter a message to sign"
            byLine={locals.current.signature ? 'Now you can verify the signed message' : ''}
          />
        <div className="py-4 flex flex-row gap-2 m-auto w-full justify-center items-center">
          <Button onClick={sign} disabled={Boolean(!text.length || (locals.current.signature && locals.current.encoded))}>Sign</Button>
          <Button onClick={verify} disabled={!locals.current.signature}>Verify</Button>
        </div>
      </div>
      <SimplifiedAlert
        open={Boolean(alertContent)}
        title=''
        description=''
        cancel={{ onClick: () => {} }}
        action={{ onClick: () => {} }}
        {...alertContent}
      />
    </main>
  );
}

function StorageSelectionTabs() {
  const storageType = usePageContextStore((state) => state.storageType);
  const onValueChange = useCallback((value: string) => {
    usePageContextStore.setState({ 
      // @ts-ignore
      storageType: value 
    });
  }, []);

  return (
    <Tabs defaultValue={storageType} onValueChange={onValueChange} className="w-full flex justify-center">
      <TabsList>
        <TabsTrigger value="local">Local</TabsTrigger>
        <TabsTrigger value="session">Session</TabsTrigger>
        <TabsTrigger value="indexdb">IndexDB</TabsTrigger>
      </TabsList>
    </Tabs>
  )
}

type ButtonProps = { useDiv?: boolean } & DetailedHTMLProps<ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>;

function Button({useDiv, ...props}: ButtonProps) {
  return (
    <button className={cn(
      "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-2 dark:hover:bg-neutral-800 dark:hover:text-neutral-100 disabled:opacity-50 dark:focus:ring-neutral-400 disabled:pointer-events-none dark:focus:ring-offset-neutral-900 data-[state=open]:bg-neutral-100 dark:data-[state=open]:bg-neutral-800",
      "bg-neutral-900 text-white hover:bg-neutral-700 dark:bg-neutral-50 dark:text-neutral-900",
      "h-10 py-2 px-6"
    )} {...props}>
      {props.children}
    </button>
  )
}

function IconButton(props: ButtonProps) {
  return (
    <button className={IconButton.className} {...props}>
      {props.children}
    </button>
  )
}

IconButton.className = cn(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-2 dark:hover:bg-neutral-800 dark:hover:text-neutral-100 disabled:opacity-50 dark:focus:ring-neutral-400 disabled:pointer-events-none dark:focus:ring-offset-neutral-900 data-[state=open]:bg-neutral-100 dark:data-[state=open]:bg-neutral-800",
  "bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 dark:text-neutral-600 dark:hover:text-neutral-100 data-[state=open]:bg-transparent dark:data-[state=open]:bg-transparent",
  "w-5 h-5"
);

type TextAreaProps = HTMLProps<HTMLTextAreaElement> & {
  byLine?: string;
}

function TextArea({byLine, ...props}: TextAreaProps) {
  return (
    <div className="grid w-full gap-1.5">
      <textarea className={cn(
        "flex h-20 w-full rounded-md border border-neutral-400 bg-transparent py-2 px-3 text-sm placeholder:text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-50 dark:focus:ring-neutral-400 dark:focus:ring-offset-neutral-900"
      )} {...props}>
        {props.children}
      </textarea>
      {byLine && (
        <p className="text-sm text-neutral-500">
          {byLine}
        </p>
      )}
    </div>
  )
}

interface SimplifiedAlertProps {
  title: string;
  description: string;
  action?: { onClick?: () => void, text?: string };
  cancel: { onClick?: () => void, text?: string };
  open?: boolean;
}

export function SimplifiedAlert(props: SimplifiedAlertProps) {
  return (
    <AlertDialog open={props.open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{props.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {props.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={props.cancel.onClick}>{props.cancel.text}</AlertDialogCancel>
          {props.action && (
            <AlertDialogAction onClick={props.action.onClick}>{props.action.text}</AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function PublicKeyDialog() {
  const context = usePageContext();
  const publicKey = usePageContextStore(state => state.publicKey);
  const isInitRef = useRef(false);

  useEffect(() => {
    if (!isInitRef.current && context.keyManager) {
      isInitRef.current = true;
      (async () => {
        await context.keyManager.setPublicKeyState();
      })()
    }
  }, [context.keyManager]);

  if (!publicKey) {
    return null;
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger className={IconButton.className}>
         <Key className="w-4 h-4" />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Your Public Key</AlertDialogTitle>
          <AlertDialogDescription className={cn(
              "w-full",
              "bg-black/90 dark:bg-black/60 text-neutral-400 rounded-md",
              "overflow-x-hidden break-all",
              "font-mono text-xs",
              "p-4 min-h-[100px]"
            )}>
            {publicKey}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction>Done</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}