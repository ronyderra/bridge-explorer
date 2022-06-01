import signalR from "@microsoft/signalr";

//main net
// const connection = new signalR.HubConnectionBuilder()
//     .withUrl("https://api.tzkt.io/v1/events")
//     .build();


//testnet
    const connection = new signalR.HubConnectionBuilder()
    .withUrl("https://hangzhounet.smartpy.io")
    .build();

async function init() {
    // open connection
    await connection.start();
   
    // subscribe to account transactions
    await connection.invoke("SubscribeToOperations", {
        address: 'KT195omxiopL2ZDqM3g8hRj2sSCG2pTqjNEj',
        types: 'transaction'
    });
};

// auto-reconnect
connection.onclose(init);

connection.on("operations", (msg) => {
    // console.log(msg);            
});

init();