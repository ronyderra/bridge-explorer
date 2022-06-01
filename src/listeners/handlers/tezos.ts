import signalR from "@microsoft/signalr";

const connection = new signalR.HubConnectionBuilder()
    .withUrl("https://api.tzkt.io/v1/events")
    .build();

async function init() {
    // open connection
    await connection.start();
   
    // subscribe to account transactions
    await connection.invoke("SubscribeToOperations", {
        address: 'KT1WKtpe58XPCqNQmPmVUq6CZkPYRms5oLvu',
        types: 'transaction'
    });
};

// auto-reconnect
connection.onclose(init);

connection.on("operations", (msg) => {
    // console.log(msg);            
});

init();