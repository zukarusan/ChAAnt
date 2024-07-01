// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron';

export type MainChaantIPC = { send: (channel: string, ...data: any) => Promise<any>, receive: (channel: string, func: (...args:any) => any |Promise<any>) => Promise<void>};
declare global {
    interface Window { mainChaant: MainChaantIPC; }
}
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
    "mainChaant", {
        send: async (channel: string, ...data: any) => {
            // whitelist channels
            let validChannels = ["start-server", "play-online", "play-computer"];
            if (validChannels.includes(channel)) {
                console.log(`ipc renderer: ${channel}`);
                return await ipcRenderer.invoke(channel, data);
            }
            return null;
        },
        receive: async (channel: string, func: (...args:any) => any | Promise<any>) => {
            let validChannels = ["chatCommand"];
            if (validChannels.includes(channel)) {
                ipcRenderer.on(channel, (event, ...args) => func(...args));
            }
        }
    }
);