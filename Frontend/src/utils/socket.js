import { io } from "socket.io-client";
import { API_BASE_URL } from "../lib/api";

const socket = io(API_BASE_URL, {
  withCredentials: true,
  transports: ["websocket"],
});

export default socket;
