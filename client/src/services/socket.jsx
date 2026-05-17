import { io } from "socket.io-client";
import toast from "react-hot-toast";

let socket;

export const initSocket = (userId) => {
  if (socket) return socket;

  const url = import.meta.env.VITE_API_URL || "";
  socket = io(url, {
    query: { userId },
    transports: ["websocket"]
  });

  socket.on("connect", () => {
    console.log("Connected to AegisVault notification server");
    socket.emit("join", userId);
  });

  socket.on("fileDownloaded", (data) => {
    toast((t) => (
      <div className="flex flex-col gap-1">
        <p className="font-bold text-vault-400">Security Alert</p>
        <p className="text-xs text-white">{data.message}</p>
        <p className="text-[10px] text-dark-500">File ID: {data.fileId}</p>
      </div>
    ), {
      icon: "🔔",
      duration: 6000,
      style: {
        background: "#0f172a",
        color: "#fff",
        border: "1px solid #334155"
      }
    });
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
