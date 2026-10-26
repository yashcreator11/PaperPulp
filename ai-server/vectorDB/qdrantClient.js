import { QdrantClient } from "@qdrant/js-client-rest";


export const qdrant = new QdrantClient({ host: "qdrant", port: 6333 });


export const COLLECTION = "historical_rca";
