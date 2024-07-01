import React, { useEffect, useState } from 'react';

function App() {
  console.log((window as any).ipcRenderer);

  const [isOpen, setOpen] = useState(false);
  const [isSent, setSent] = useState(false);
  const [fromMain, setFromMain] = useState<string | null>(null);

  const [agentId, setAgentId] = useState(null);
  const [serverRunning, setServerRunning] = useState(false);
  const [serverStarting, setServerStarting] = useState(false);
  const [playResult, setPlayResult] = useState('');

  const handleToggle = () => {
    if (isOpen) {
      setOpen(false);
      setSent(false);
    } else {
      setOpen(true);
      setFromMain(null);
    }
  };
  const sendMessageToElectron = () => {
    if ((window as any).Main) {
        (window as any).Main.sendMessage("Hello I'm from React World");
    } else {
        setFromMain('You are in a Browser, so no Electron functions are available');
    }
    setSent(true);
  };
  const handleStartServer = async () => {
    setServerStarting(true);
    try {
      const id = await window.mainChaant.send('start-server');
      setAgentId(id);
      setServerRunning(true);
    } finally {
      setServerStarting(false);
    }
  };
  const handlePlayOnline = async () => {
    const result = await window.mainChaant.send('play-online');
    setPlayResult(result);
  };

  const handlePlayComputer = async () => {
      const result = await window.mainChaant.send('play-computer');
      setPlayResult(result);
  };
  useEffect(() => {
    if (isSent && (window as any).Main)
        (window as any).Main.on('message', (message: string) => {
            setFromMain(message);
        });
  }, [fromMain, isSent]);

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-auto">
        <div className=" flex flex-col justify-center items-center h-full bg-gray-800 space-y-4">
            <h1 className="text-2xl text-gray-200"><image >ChAAnt</image></h1>
            <h3 className="text-2xm text-gray-200">Chess Automation Agent</h3>
            <button
                className="bg-red-400 flex flex-row content-between py-2 px-4 rounded focus:outline-none shadow hover:bg-red-200"
                onClick={handleStartServer}
            >
                { serverStarting && <svg aria-hidden="true" className="w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
                    <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
                </svg> }
                <span className="text-gray-600"> { serverRunning ? "Loading..." : "New Agent"} </span>
            </button>
            {serverRunning && (
            <div className="flex flex-col space-y-4 items-center">
                <div className="flex space-x-3">
                <h4 className="text-xl text-gray-50">Agent ID: {agentId}</h4>
                <button
                    onClick={handlePlayOnline}
                    className=" bg-green-400 rounded px-4 py-0 focus:outline-none hover:bg-green-300"
                >
                    Play Online
                </button>
                <button
                    onClick={handlePlayComputer}
                    className=" bg-green-400 rounded px-4 py-0 focus:outline-none hover:bg-green-300"
                >
                    Play Computer
                </button>
                </div>
            </div>
            )}
        </div>
      </div>
    </div>
  );
}

export default App;