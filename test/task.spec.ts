// with { "type": "module" } in your package.json
import { createServer } from "http";
import { io as Client } from "socket.io-client";
import { Server } from "socket.io";
import { assert } from "chai";
import chai from 'chai'
import chaiHttp from 'chai-http'


chai.use(chaiHttp)
const should = chai.should()

//Socket testing 
describe("socket testing", () => {
  let io: any, serverSocket: any, clientSocket: any;

  before((done) => {
    const httpServer: any = createServer();
    io = new Server(httpServer);
    httpServer.listen(() => {
      const port: any = httpServer.address().port;
      clientSocket = /*new*/ Client(`http://localhost:${port}`);
      io.on("connection", (socket:any) => {
        serverSocket = socket;
      });
      clientSocket.on("connect", done);
    });
  });

  after(() => {
    io.close();
    clientSocket.close();
  });

  it("socket test 1", (done:any) => {
    clientSocket.on("hello", (arg: any) => {
      assert.equal(arg, "world");
      done();
    });
    serverSocket.emit("hello", "world");
  });

  it("socket test 2 (with ack)", (done) => {
    serverSocket.on("hi", (cb:any) => {
      cb("hola");
    });
    clientSocket.emit("hi", (arg:any) => {
      assert.equal(arg, "hola");
      done();
    });
  });
})

//API testing
describe("GET / - getting transactions", () => {
  it("test 1 - basic / GET call", async () => {
    const result = await chai.request("http://localhost:3100").get("/")
    result.body.should.have.property("events")
    result.body.should.have.property("count")
  })

  it("test 2 -  GET / with filters ", async () => {
    const result = await chai.request("http://localhost:3100").get("/?chainName=bsc")
    result.body.should.have.property("events")
    result.body.should.have.property("count")
  })

  it("test 3 -  GET / with bad chain name filters ", async () => {
    const result = await chai.request("http://localhost:3100").get("/?chainName=bsn")
    result.body.should.have.property("count").equal(0)
  })

  it("test 4 - GET call with fromHash filter", async () => {
    const result = await chai.request("http://localhost:3100").get("/?chainName=0x2c4f5c626d795e6937c7f4e015bf7f37442bd2ab0c00bd113675cf5e1b9914ec&sort=DESC&offset=0")
    result.body.should.have.property("events")
    result.body.should.have.property("count")
    result.body.events.should.have.keys("id","chainName","type","fromChain","toChain","fromChainName","toChainName","actionId","txFees","dollarFees","tokenId","initialTokenId","status","fromHash","toHash","targetAddress","senderAddress","nftUri","contract","collectionName","createdAt")
    result.body.count.should.eq(1)
  })
  it("test 5 - GET call with fromHash filter,but WITHOUT sort and offset", async () => {
    const result = await chai.request("http://localhost:3100").get("/?chainName=0x2c4f5c626d795e6937c7f4e015bf7f37442bd2ab0c00bd113675cf5e1b9914ec&sort=DESC&offset=0")
    result.body.should.have.property("events")
    result.body.should.have.property("count")
    result.body.count.should.eq(1)
  })
})

describe("GET /getMetrics - getting metrics", () => {
  it("test 1 - simple getting metrics", async () => {
    const res = await chai.request("http://localhost:3100").get("/getMetrics")
    res.body.should.have.property("totalTx").above(0)
    res.body.should.have.property("totalWallets").above(0)
  })
})

describe("GET /dashboard - getting the dashboard", () => {
  it("test 1 - get the dashboard", async () => {
    const result = await chai.request("http://localhost:3100").get("/dashboard")
    result.body[0].should.have.keys("id", "txNumber", "walletsNumber", "date")
  })
})

describe("POST /reportIssue - reporting issue",()=>{
  it("test 1 - simple POST, reporting an issue not sending with captcha, unautherized",async ()=>{
     const res = await chai.request("http://localhost:3100").post("/reportIssue")
     res.status.should.eq(401)
  })

  it("test 2 - simple POST, (NEED COMMENTED OUT THE CAPTCHA MIDDLEWARE), reporting an issue not sending with captcha",async ()=>{
    const res = await chai.request("http://localhost:3100").post("/reportIssue").send("this is the message")
    res.status.should.eq(200)
    res.text.should.eq(`{"message":"Hash not found"}`)
 })
})
