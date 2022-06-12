// with { "type": "module" } in your package.json
import { createServer } from "http";
import { io as Client } from "socket.io-client";
import { Server } from "socket.io";
import { assert } from "chai";

// with { "type": "commonjs" } in your package.json
// const { createServer } = require("http");
// const { Server } = require("socket.io");
// const Client = require("socket.io-client");
// const assert = require("chai").assert;

describe("my awesome project", () => {
  let io, serverSocket, clientSocket;

  before((done) => {
    const httpServer = createServer();
    io = new Server(httpServer);
    httpServer.listen(() => {
      const port = httpServer.address().port;
      clientSocket = new Client(`http://localhost:${port}`);
      io.on("connection", (socket) => {
        serverSocket = socket;
      });
      clientSocket.on("connect", done);
    });
  });

  after(() => {
    io.close();
    clientSocket.close();
  });

  // it("should work", (done) => {
  //   clientSocket.on("hello", (arg) => {
  //     assert.equal(arg, "world");
  //     done();
  //   });
  //   serverSocket.emit("hello", "world");
  // });

  it("should work (with ack)", (done) => {
    serverSocket.on("web3:bridge_tx", (a) => {

      
      console.log(a);
    });

    clientSocket.emit("web3:bridge_tx", {
      fromChain: 7,
      fromHash: "0x14ab335d1474355c6c713a2177ea0129383a3a2dfb3c1ca63534778a4ceb00d1",
      actionId: "258",
      type: "Unfreeze",
    });
  });
});

