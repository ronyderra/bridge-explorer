import axios from "axios";

export const getTezosCollectionData = async (hash: string) => {
    try {
        const data = await axios.get(`https://api.tzkt.io/v1/operations/${hash}`)
        if (!data) return;

        const entrypoint = data.data[0].parameter?.entrypoint;
        const tokenId = data.data[0].parameter?.value?.token_id
        
        let contractAdd = "";
        let collectionName = "";

        if (entrypoint === "withdraw_nft") {
            contractAdd = data.data[0].parameter?.value?.burner;
            collectionName = "WNFT";
        } else {
            contractAdd = data.data[1]?.target?.address;
            collectionName = data.data[1]?.target?.alias;
        }

        console.log("tokenId:", tokenId);
        console.log("contractAdd:", contractAdd);
        console.log("collectionName:", collectionName);

        return { tokenId, contractAdd, collectionName }
    } catch (err) {
        console.log(err)
    }
}