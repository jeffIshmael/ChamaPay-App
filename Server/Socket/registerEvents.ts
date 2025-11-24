import { Server as socketIOServer , Socket} from "socket.io";

export function testSocket(io:socketIOServer, socket: Socket){
    socket.on("testSocket",(data)=>{
        socket.emit("testSocket", {msg: "Testing approved."});
    })
}