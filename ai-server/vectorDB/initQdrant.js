import { qdrant, COLLECTION } from "./qdrantClient.js";

await qdrant.createCollection(COLLECTION, {
  vectors: {
    size: 200,
    distance: "Cosine"
  }
});

console.log("Qdrant collection ready");
